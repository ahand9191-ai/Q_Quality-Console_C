#!/usr/bin/env python3
"""
Image-based highlighter for scanned MTR documents.
Uses Tesseract OCR word-level bounding boxes to find and highlight
extracted field values directly on the page image (for docs with no
searchable text layer — i.e. scanned/photographed forms).
"""

import re
import pytesseract
from PIL import Image, ImageDraw
from pathlib import Path

FIELD_COLORS_RGBA = {
    "heatNumber":     (0, 200, 0, 90),      # Green
    "poNumber":       (0, 120, 255, 90),    # Blue
    "specification":  (255, 180, 0, 90),    # Orange/Yellow
    "grade":          (200, 0, 200, 90),    # Magenta
    "size":           (0, 200, 200, 90),    # Cyan
    "type":           (255, 100, 0, 90),    # Orange
    "quantity":       (255, 60, 60, 90),    # Red
    "domestic":       (0, 220, 0, 110),     # Bright green
}


def _normalize(s):
    return re.sub(r'[^A-Z0-9]', '', s.upper())


def get_ocr_words(image_path):
    """Return list of {text, left, top, width, height, conf} for each OCR'd word."""
    img = Image.open(image_path).convert("RGB")
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    words = []
    for i, text in enumerate(data['text']):
        if text.strip():
            words.append({
                "text": text,
                "left": data['left'][i],
                "top": data['top'][i],
                "width": data['width'][i],
                "height": data['height'][i],
                "conf": data['conf'][i],
            })
    return words, img.size


def _boxes_overlap(a, b, threshold=0.5):
    """Check if two boxes overlap significantly (IoU-ish)."""
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    if ix1 <= ix0 or iy1 <= iy0:
        return False
    inter = (ix1 - ix0) * (iy1 - iy0)
    area_a = (ax1 - ax0) * (ay1 - ay0)
    area_b = (bx1 - bx0) * (by1 - by0)
    smaller = min(area_a, area_b)
    if smaller == 0:
        return False
    return (inter / smaller) > threshold


def find_value_boxes(words, value, max_word_span=6, min_exact_len=2):
    """
    Find bounding box(es) on the page matching a target value.
    Strategy: prefer EXACT normalized match on a contiguous word span.
    Only fall back to substring match for longer values (>=6 chars) to
    avoid false positives on short numeric fields.
    Deduplicates overlapping candidate boxes, keeping the tightest span.
    """
    if not value or not value.strip():
        return []

    target_norm = _normalize(value)
    if len(target_norm) < min_exact_len:
        return []

    n = len(words)
    candidates = []  # (box, span_len) - prefer shortest span (tightest match)

    for start in range(n):
        joined = ""
        for span in range(1, max_word_span + 1):
            end = start + span
            if end > n:
                break
            joined = "".join(_normalize(w["text"]) for w in words[start:end])
            is_exact = joined == target_norm
            is_substr = len(target_norm) >= 6 and target_norm in joined and len(joined) <= len(target_norm) + 4
            if is_exact or is_substr:
                group = words[start:end]
                x0 = min(w["left"] for w in group)
                y0 = min(w["top"] for w in group)
                x1 = max(w["left"] + w["width"] for w in group)
                y1 = max(w["top"] + w["height"] for w in group)
                candidates.append(((x0, y0, x1, y1), span, is_exact))
                if is_exact:
                    break  # don't keep expanding once we have an exact match at this start

    if not candidates:
        return []

    # Prefer exact matches, then shortest span
    candidates.sort(key=lambda c: (not c[2], c[1]))

    # Deduplicate overlapping boxes
    final_boxes = []
    for box, span, is_exact in candidates:
        if any(_boxes_overlap(box, fb) for fb in final_boxes):
            continue
        final_boxes.append(box)

    return final_boxes[:4]  # cap to avoid clutter


def highlight_image(image_path, fields, output_path, domestic_keywords=None):
    """
    Draw colored highlight boxes on a scanned page image for each
    extracted field value found via OCR. Returns list of highlight records.
    """
    words, size = get_ocr_words(image_path)
    img = Image.open(image_path).convert("RGB")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    highlights = []

    for field_name, value in fields.items():
        if field_name in ("rawText", "domesticStatus", "countryOfOrigin"):
            continue
        if not value:
            continue
        color = FIELD_COLORS_RGBA.get(field_name, (255, 255, 0, 90))
        boxes = find_value_boxes(words, str(value))
        for box in boxes:
            padded = (box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3)
            draw.rectangle(padded, fill=color, outline=color[:3] + (255,), width=2)
            highlights.append({
                "field": field_name,
                "value": value,
                "box": [int(c) for c in box],
            })

    # Domestic indicators
    if domestic_keywords:
        color = FIELD_COLORS_RGBA["domestic"]
        for kw in domestic_keywords:
            boxes = find_value_boxes(words, kw, max_word_span=8, min_exact_len=3)
            for box in boxes:
                padded = (box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3)
                draw.rectangle(padded, fill=color, outline=color[:3] + (255,), width=2)
                highlights.append({
                    "field": "domestic",
                    "value": kw,
                    "box": [int(c) for c in box],
                })

    combined = Image.alpha_composite(img.convert("RGBA"), overlay)
    combined.convert("RGB").save(output_path)
    return highlights


if __name__ == "__main__":
    import sys, json
    if len(sys.argv) < 2:
        print("Usage: highlight_scanned.py <image_path>")
        sys.exit(1)
    words, size = get_ocr_words(sys.argv[1])
    print(json.dumps(words[:20], indent=2))
