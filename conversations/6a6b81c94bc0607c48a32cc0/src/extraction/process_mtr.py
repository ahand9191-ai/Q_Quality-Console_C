#!/usr/bin/env python3
"""
MTR (Material Test Report) Processor v2
- Extracts key fields from PDF/image MTRs with improved regex patterns
- Identifies domestic (USA) material
- Highlights extracted fields on the document
- Outputs structured data for approval workflow
"""

import sys
import os
import json
import re
import io
from pathlib import Path

# PDF processing
import fitz  # PyMuPDF
import pdfplumber

# Image OCR
from PIL import Image
import pytesseract

# ===== FIELD EXTRACTION PATTERNS =====
# Patterns are ordered by specificity — most specific first
# Each pattern captures ONLY the value, not the label

PATTERNS = {
    "heatNumber": [
        # Heat Number: H-4471B  (requires colon or dash after the label)
        r'heat\s*(?:no\.?|number|#)\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{3,19})',
        # Heat: H-4471B
        r'\bheat\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{3,19})',
        # Heat # H-4471B (with space)
        r'\bheat\s*#\s*([A-Z0-9][A-Z0-9\-]{3,19})',
        # H-4471B near the word "heat" (reverse pattern)
        r'\b([A-Z]{1,3}\d{3,8}[A-Z]?)\b\s*\n{0,2}.*?heat',
        # Heat/Lot combined: H-4471B / Lot-123
        r'heat\s*(?:no\.?|number|#)\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{3,19})\s*(?:/|\\|\s+lot)',
    ],
    "poNumber": [
        # PO Number: 24-0153
        r'\bP\.?O\.?\s*(?:no\.?|number|#)?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{2,19})',
        # Purchase Order: 24-0153
        r'purchase\s*order\s*(?:no\.?|number|#)?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{2,19})',
        # Order No: 24-0153
        r'\border\s*(?:no\.?|number|#)?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{2,19})',
        # SO Number: 24-0153
        r'\bS\.?O\.?\s*(?:no\.?|number|#)?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{2,19})',
        # PO: followed by a number pattern (with word boundary after PO)
        r'\bPO\b\s*[:]\s*([0-9]{2,6}[-_]?[0-9]{2,6})',
    ],
    "specification": [
        # ASTM A709
        r'\b(ASTM\s+[A-Z]?\d{2,4}[A-Z]?(?:\s*/\s*(?:ASTM\s+)?[A-Z]?\d{2,4}[A-Z]?)?)',
        # AASHTO M270
        r'\b(AASHTO\s+M\d{2,4}[A-Z]?)',
        # ASME
        r'\b(ASME\s+[A-Z]?\d{2,4}[A-Z]?)',
        # AWS
        r'\b(AWS\s+[A-Z]?\d\.\d[A-Z]?)',
        # API
        r'\b(API\s+\d[A-Z]?)',
        # CSA
        r'\b(CSA\s+G\d+\.\d+)',
        # MIL-STD
        r'\b(MIL-STD-\d{3,4})',
        # Spec: ASTM A709 (with label)
        r'spec(?:ification)?\s*[:\-]\s*(ASTM\s+[A-Z]?\d{2,4}[A-Z]?)',
    ],
    "grade": [
        # Grade: 50W
        r'\bgrade\s*[:\-]\s*([\w\-/]{1,12})',
        # Gr. 50W
        r'\bGr\.?\s*[:\-]?\s*([\d]{2,3}[A-Z]?)',
        # ASTM A709 Grade 50W
        r'grade\s+([\d]{2,3}[A-Z]?)',
        # GRADE 50 (all caps context)
        r'\bGRADE\s+([\d]{2,3}[A-Z]?)',
    ],
    "size": [
        # Size: 1/2" x 48" x 240"
        r'\bsize\s*[:\-]\s*([\d/]+["\s]*(?:x\s*[\d/]+["\s]*){1,3})',
        # Dimensions: 1/2" x 48"
        r'\bdimensions?\s*[:\-]\s*([\d/]+["\s]*(?:x\s*[\d/]+["\s]*){1,3})',
        # Thickness: 1/2"
        r'\bthick(?:ness)?\s*[:\-]\s*([\d/]+["\s]*(?:x\s*[\d/]+["\s]*){0,2})',
        # Diameter: 2.5"
        r'\bdiameter\s*[:\-]\s*([\d.]+["]?)',
        # 1/2" x 48" x 240" (standalone dimension pattern)
        r'([\d/]+["]\s*x\s*[\d/]+["]\s*x\s*[\d/]+["])',
        # 2.5" thick
        r'([\d.]+["]\s*(?:thick|THK|thk))',
    ],
    "type": [
        # Type: Plate
        r'\btype\s*[:\-]\s*(plate|bar|beam|angle|channel|flat\s*bar|round\s*bar|square\s*bar|sheet|pipe|tube|wire|structural\s*tubing|HSS)',
        # Standalone type words (exact match on word boundary)
        r'\b(plate)\b',
        r'\b(flat\s*bar)\b',
        r'\b(round\s*bar)\b',
        r'\b(square\s*bar)\b',
        r'\b(structural\s*tubing)\b',
        r'\b(beam)\b',
        r'\b(angle)\b',
        r'\b(channel)\b',
        r'\b(sheet)\b',
        r'\b(pipe)\b',
        r'\b(tube)\b',
        r'\b(HSS)\b',
        r'\b(bar)\b',
    ],
    "quantity": [
        # Quantity: 12 or Qty: 12
        r'\b(?:qty|quantity)\s*[:\-]\s*(\d+(?:\.\d+)?)',
        # 12 pcs / 12 pieces
        r'(\d+)\s*(?:pcs|pcs\.|pieces|pc\b)',
        # Pieces: 12
        r'\bpieces?\s*[:\-]\s*(\d+)',
        # No. of Pcs: 12
        r'\bno\.?\s*of\s*pcs?\s*[:\-]\s*(\d+)',
        # Weight: 4,860 lbs (separate from count)
        r'\bweight\s*[:\-]\s*(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:lbs?|lb|pounds?|kg|tons?))',
        # Total Weight: 4,860 lbs
        r'\btotal\s*weight\s*[:\-]\s*(\d+(?:,\d{3})*(?:\.\d+)?\s*(?:lbs?|lb|pounds?|kg|tons?))',
    ],
}

# Domestic / country of origin patterns
DOMESTIC_PATTERNS = [
    r'country\s*of\s*origin\s*[:\-]\s*([A-Za-z\s\.]+?)(?:\n|$)',
    r'melted\s*and\s*poured\s*in\s*(?:the\s*)?(?:USA|U\.S\.A\.?)',
    r'melted\s*&\s*poured\s*in\s*(?:the\s*)?(?:USA|U\.S\.A\.?)',
    r'produced\s*in\s*(?:the\s*)?(?:USA|U\.S\.A\.?)',
    r'manufactured\s*in\s*(?:the\s*)?(?:USA|U\.S\.A\.?)',
    r'made\s*in\s*(?:the\s*)?(?:USA|U\.S\.A\.?)',
    r'\bdomestic\b',
    r'product\s*of\s*(?:the\s*)?(?:USA|U\.S\.A\.?|United\s*States)',
    r'buy\s*america',
]

FOREIGN_INDICATORS = [
    'china', 'japan', 'korea', 'germany', 'italy', 'france', 'india',
    'brazil', 'mexico', 'canada', 'russia', 'ukraine', 'turkey',
    'taiwan', 'vietnam', 'thailand', 'spain', 'belgium',
    'netherlands', 'poland', 'czech', 'slovakia', 'romania',
]

# Highlight color mapping (RGB values for PyMuPDF)
FIELD_COLORS = {
    "heatNumber":     (0.2, 0.8, 0.2),   # Green
    "poNumber":       (0.2, 0.6, 1.0),   # Blue
    "specification":  (1.0, 0.8, 0.0),   # Yellow/Orange
    "grade":          (0.9, 0.3, 0.9),   # Magenta
    "size":           (0.3, 0.9, 0.9),   # Cyan
    "type":           (1.0, 0.5, 0.0),   # Orange
    "quantity":       (1.0, 0.3, 0.3),   # Red
    "domestic":       (0.1, 0.9, 0.1),   # Bright Green
}


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber (best for text-based PDFs)."""
    text_pages = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                text_pages.append(text)
    except Exception as e:
        print(f"pdfplumber error: {e}", file=sys.stderr)
    return text_pages


def extract_text_from_image(image_path):
    """Extract text from image using Tesseract OCR."""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img, config='--psm 6')
        return [text]
    except Exception as e:
        print(f"OCR error: {e}", file=sys.stderr)
        return [""]


def extract_text_ocr_pdf(pdf_path):
    """For scanned PDFs - render pages as images and OCR them."""
    text_pages = []
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            text = pytesseract.image_to_string(img, config='--psm 6')
            text_pages.append(text)
        doc.close()
    except Exception as e:
        print(f"OCR PDF error: {e}", file=sys.stderr)
    return text_pages


def clean_value(value):
    """Clean up an extracted value."""
    if not value:
        return ""
    # Remove trailing labels that got captured
    value = re.sub(r'\s*(?:Grade|Size|Type|Quantity|Weight|Notes?)\s*$', '', value, flags=re.IGNORECASE)
    # Remove newlines, collapse whitespace
    value = value.replace('\n', ' ').strip()
    # Remove trailing punctuation
    value = value.strip(' \t\n\r:;-.,')
    return value


def extract_fields(text_pages):
    """Extract structured fields from text using regex patterns."""
    full_text = "\n".join(text_pages)
    results = {}

    for field, patterns in PATTERNS.items():
        found = None
        for pattern in patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            if matches:
                # Take the first match, clean it up
                found = str(matches[0]).strip()
                found = clean_value(found)
                if len(found) >= 1:
                    # Skip common false positives
                    skip_words = {'number', 'order', 'heat', 'grade', 'size', 'type', 'quality', 'ure', 'ured'}
                    if found.lower() in skip_words:
                        continue
                    break
        results[field] = found or ""

    # Check domestic status
    results["domesticStatus"] = "Unknown"
    results["countryOfOrigin"] = ""

    for pattern in DOMESTIC_PATTERNS:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            origin_text = match.group(0) if match.lastindex is None else match.group(0)
            # Try to extract country from the match
            if match.lastindex and match.lastindex >= 1:
                origin = match.group(1).strip()
            else:
                origin = origin_text.strip()
            
            if re.search(r'(USA|U\.S\.A\.?|United\s*States|domestic|america)', origin, re.IGNORECASE):
                results["domesticStatus"] = "Domestic"
                results["countryOfOrigin"] = "USA"
                break
            else:
                results["countryOfOrigin"] = origin

    # Check for foreign indicators
    if results["domesticStatus"] == "Unknown":
        for country in FOREIGN_INDICATORS:
            if re.search(r'\b' + country + r'\b', full_text, re.IGNORECASE):
                results["countryOfOrigin"] = country.capitalize()
                results["domesticStatus"] = "Foreign"
                break

    # If we found "USA" anywhere and no foreign indicators, mark as domestic
    if results["domesticStatus"] == "Unknown":
        if re.search(r'\b(USA|U\.S\.A\.?)\b', full_text):
            results["domesticStatus"] = "Domestic"
            results["countryOfOrigin"] = "USA"

    # Extract raw text for reference
    results["rawText"] = full_text[:5000]

    return results


def highlight_pdf(pdf_path, fields, output_path):
    """Highlight extracted fields on the PDF using PyMuPDF."""
    doc = fitz.open(pdf_path)
    highlights = []

    for page_num, page in enumerate(doc):
        # Highlight each extracted field value
        for field_name, patterns in PATTERNS.items():
            value = fields.get(field_name, "")
            if not value:
                continue

            color = FIELD_COLORS.get(field_name, (1.0, 1.0, 0.0))

            # Search for the extracted value in the page
            try:
                text_instances = page.search_for(value)
                if text_instances:
                    for inst in text_instances[:3]:  # Limit to 3 highlights per field per page
                        highlight = page.add_highlight_annot(inst)
                        highlight.set_colors(stroke=color)
                        highlight.set_info(content=f"FIELD: {field_name} = {value}")
                        highlight.update()
                        highlights.append({
                            "field": field_name,
                            "value": value,
                            "page": page_num + 1,
                            "rect": [round(inst.x0, 2), round(inst.y0, 2), round(inst.x1, 2), round(inst.y1, 2)]
                        })
            except Exception:
                pass

        # Highlight domestic status indicators
        if fields.get("domesticStatus") == "Domestic":
            color = FIELD_COLORS["domestic"]
            for keyword in ["USA", "U.S.A.", "United States", "DOMESTIC", "MELTED AND POURED", "Buy America"]:
                try:
                    instances = page.search_for(keyword)
                    for inst in instances[:2]:
                        highlight = page.add_highlight_annot(inst)
                        highlight.set_colors(stroke=color)
                        highlight.set_info(content=f"DOMESTIC: {keyword}")
                        highlight.update()
                        highlights.append({
                            "field": "domestic",
                            "value": keyword,
                            "page": page_num + 1,
                            "rect": [round(inst.x0, 2), round(inst.y0, 2), round(inst.x1, 2), round(inst.y1, 2)]
                        })
                except Exception:
                    pass

    doc.save(output_path)
    doc.close()
    return highlights


def render_pdf_page_images(pdf_path, max_pages=5, output_prefix="/tmp/mtr_page"):
    """Render PDF pages as images for web display."""
    doc = fitz.open(pdf_path)
    images = []

    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        img_path = f"{output_prefix}_{i}.png"
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        pix.save(img_path)
        images.append(img_path)

    doc.close()
    return images


def process_mtr(file_path, output_dir="/tmp/mtr_output"):
    """Main processing function."""
    os.makedirs(output_dir, exist_ok=True)

    file_ext = Path(file_path).suffix.lower()
    file_name = Path(file_path).stem

    # Step 1: Extract text
    text_pages = []
    is_scanned = False

    if file_ext == '.pdf':
        text_pages = extract_text_from_pdf(file_path)
        total_text = "".join(text_pages).strip()
        if len(total_text) < 50:
            print("PDF appears to be scanned — using OCR...", file=sys.stderr)
            is_scanned = True
            text_pages = extract_text_ocr_pdf(file_path)
    elif file_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
        text_pages = extract_text_from_image(file_path)
    else:
        return {"error": f"Unsupported file type: {file_ext}"}

    # Step 2: Extract structured fields
    fields = extract_fields(text_pages)

    # Step 3: Highlight on document (PDF only)
    highlighted_path = None
    highlights = []

    if file_ext == '.pdf':
        highlighted_path = os.path.join(output_dir, f"{file_name}_highlighted.pdf")
        try:
            highlights = highlight_pdf(file_path, fields, highlighted_path)
        except Exception as e:
            print(f"Highlight error: {e}", file=sys.stderr)
            highlighted_path = None

    # Step 4: Render page images for preview
    page_images = []
    if highlighted_path and os.path.exists(highlighted_path):
        page_images = render_pdf_page_images(highlighted_path)
    elif file_ext == '.pdf':
        page_images = render_pdf_page_images(file_path)
    elif file_ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp']:
        page_images = [file_path]

    # Step 5: Build result
    result = {
        "fileName": Path(file_path).name,
        "isScanned": is_scanned,
        "extractedFields": {
            "heatNumber": fields.get("heatNumber", ""),
            "poNumber": fields.get("poNumber", ""),
            "specification": fields.get("specification", ""),
            "grade": fields.get("grade", ""),
            "size": fields.get("size", ""),
            "type": fields.get("type", ""),
            "quantity": fields.get("quantity", ""),
            "domesticStatus": fields.get("domesticStatus", "Unknown"),
            "countryOfOrigin": fields.get("countryOfOrigin", ""),
        },
        "highlights": highlights,
        "highlightedPdfPath": highlighted_path,
        "pageImages": page_images,
        "approvalStatus": "Pending Review",
        "processedDate": __import__('datetime').datetime.now().isoformat(),
    }

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: process_mtr.py <file_path> [output_dir]")
        sys.exit(1)

    file_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/mtr_output"

    result = process_mtr(file_path, output_dir)
    print(json.dumps(result, indent=2))
