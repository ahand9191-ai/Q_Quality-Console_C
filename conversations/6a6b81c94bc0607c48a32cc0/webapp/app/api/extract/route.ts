import { NextRequest, NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: 'Only PDF files are supported' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Step 1: Try fast text extraction first (works for digital/text-based PDFs)
    let fullText = '';
    let extractionMethod = 'text';

    try {
      fullText = await extractPdfText(bytes);
    } catch (e) {
      console.error('Text extraction failed, will try OCR:', e);
    }

    // Step 2: If no text found, it's likely a scanned PDF — fall back to Textract OCR
    if (!fullText || fullText.trim().length < 50) {
      extractionMethod = 'textract';
      fullText = await callTextract(bytes);
    }

    // Step 3: GPT-4o — structured field extraction from the text
    const extractedData = await callGPT4o(fullText, file.name);

    // Step 4: Derive material type from spec
    if (extractedData.specifications) {
      extractedData.materialType = deriveMaterialType(extractedData.specifications);
    }

    // Step 5: Derive shape from size designation if GPT-4o didn't catch it
    if (!extractedData.shape && extractedData.sizes) {
      extractedData.shape = deriveShape(extractedData.sizes, fullText);
    }

    return NextResponse.json({
      success: true,
      extractionMethod,
      textLength: fullText.length,
      extractedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error';
    console.error('Extraction error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Derive material type from specification ───

function deriveMaterialType(specs: string[]): string {
  const specStr = specs.join(' ').toUpperCase();
  
  if (specStr.includes('A588') || specStr.includes('A709') || specStr.includes('709')) {
    return 'Weathering Steel';
  }
  if (specStr.includes('A500')) return 'A500';
  if (specStr.includes('A36') || specStr.includes('SA36')) return 'A36';
  if (specStr.includes('A992')) return 'A992';
  if (specStr.includes('L304') || specStr.includes('304') || specStr.includes('S304') || specStr.includes('STAINLESS')) {
    return 'Stainless Steel';
  }
  if (specStr.includes('A53')) return 'A53';
  if (specStr.includes('A513')) return 'A513';
  return '';
}

// ─── Derive shape from size designation and text ───

function deriveShape(sizes: string[], fullText: string): string {
  const text = fullText.toUpperCase();
  const sizeStr = sizes.join(' ').toUpperCase();

  // Check size designation patterns
  if (sizeStr.match(/^W\d/)) return 'I Beam';
  if (sizeStr.match(/^HP\d/)) return 'H Beam';
  if (sizeStr.match(/^C\d/) || sizeStr.match(/^MC\d/)) return 'Channel';
  if (sizeStr.match(/^L\d/)) return 'Angle';
  if (sizeStr.match(/^HSS/) || sizeStr.match(/^\d+\s*X\s*\d+\s*X\s*\d/)) {
    if (sizeStr.includes('ROUND') || sizeStr.match(/HSS\s*\d+\s*X\s*[\d.]+\s*WALL/i)) return 'Round';
    return 'Square';
  }
  if (sizeStr.match(/^PL\s/) || text.match(/\bPLATE\b/)) return 'Plate';
  if (text.match(/\bFLAT\s*BAR\b/)) return 'Flat Bar';
  if (text.match(/\bPIPE\b/) || sizeStr.match(/^NPS/) || sizeStr.match(/^(?:NPS|SCH)/)) return 'Pipe';
  if (text.match(/\bCOIL\b/)) return 'Coil';
  if (text.match(/\bROUND\b/) || sizeStr.match(/^RD/) || sizeStr.match(/BAR\s*RD/i)) return 'Round';

  // Check raw text for shape keywords
  if (text.match(/\bI\s*BEAM\b/) || text.match(/\bWIDE\s*FLANGE\b/)) return 'I Beam';
  if (text.match(/\bH\s*BEAM\b/)) return 'H Beam';
  if (text.match(/\bCHANNEL\b/)) return 'Channel';
  if (text.match(/\bPLATE\b/)) return 'Plate';
  if (text.match(/\bFLAT\s*BAR\b/)) return 'Flat Bar';
  if (text.match(/\bPIPE\b/)) return 'Pipe';
  if (text.match(/\bCOIL\b/)) return 'Coil';
  if (text.match(/\bROUND\b/) && text.match(/\bBAR\b/)) return 'Round';
  if (text.match(/\bSQUARE\b/) && text.match(/\bTUBE\b/)) return 'Square';

  return '';
}

// ─── Fast PDF text extraction (no AWS needed) ───

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);

  const textChunks: string[] = [];
  const btEtRegex = /BT\s+([\s\S]*?)\s+ET/g;
  let match;

  while ((match = btEtRegex.exec(raw)) !== null) {
    const textObj = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    const tjMatch = tjRegex.exec(textObj);
    if (tjMatch) {
      textChunks.push(tjMatch[1]);
    }

    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    const tjArrayMatch = tjArrayRegex.exec(textObj);
    if (tjArrayMatch) {
      const parts = tjArrayMatch[1].split(/\)\s*\(/);
      for (const part of parts) {
        const cleaned = part.replace(/^\(/, '').replace(/\)$/, '');
        if (cleaned) textChunks.push(cleaned);
      }
    }
  }

  let text = textChunks.join('\n');

  if (text.trim().length < 50) {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(bytes);
    text = data.text || '';
  }

  return text;
}

// ─── AWS Textract OCR fallback (scanned PDFs only) ───

async function callTextract(bytes: Uint8Array): Promise<string> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. This scanned PDF requires Textract OCR but AWS credentials are missing.');
  }

  const client = new TextractClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const pageBytes = await splitPdfPages(bytes);
  const allText: string[] = [];

  for (let i = 0; i < Math.min(pageBytes.length, 3); i++) {
    const command = new DetectDocumentTextCommand({
      Document: { Bytes: pageBytes[i] },
    });

    const result: any = await client.send(command);
    const blocks: any[] = result.Blocks || [];

    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        allText.push(block.Text);
      }
    }
  }

  const text = allText.join('\n');
  if (!text || text.trim().length < 50) {
    throw new Error('Could not extract text from this PDF. It may be corrupted or password-protected.');
  }
  return text;
}

// ─── Split PDF into individual pages ───

async function splitPdfPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  if (pageCount <= 1) {
    return [bytes];
  }

  const pages: Uint8Array[] = [];
  for (let i = 0; i < pageCount; i++) {
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
    singlePageDoc.addPage(copiedPage);
    const pdfBytes = await singlePageDoc.save();
    pages.push(new Uint8Array(pdfBytes));
  }
  return pages;
}

// ─── GPT-4o structured extraction ───

async function callGPT4o(fullText: string, fileName: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY?.replace(/['"]/g, '').trim();
  if (!apiKey) throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in Vercel env vars.');

  const systemPrompt = `You are an expert metallurgical QA/QC inspector specializing in structural steel Mill Test Reports (MTRs) for bridge construction. Extract ALL data from the MTR text provided below.

CRITICAL FIELDS (in priority order):
1. Heat Numbers — THE most important field. There may be 3-5+ heats on a single page. Extract ALL of them.
   - Heat numbers are typically 5-8 digit numbers associated with chemistry data (C, Mn, P, S, etc.)
   - They are NOT work order numbers, PO numbers, or order numbers.
   - Heat numbers usually appear near or above the chemistry table rows.
   - If a number is labeled "WO", "Work Order", "Order", "Lot" — that is NOT a heat number.
   - Only extract numbers that are clearly labeled as "Heat", "Heat No", "Heat Number", or appear as the identifier in a chemistry table row.
2. Specification — e.g. ASTM A588, A709, A500, A36, A992, A53. Do NOT guess. If unclear, leave blank.
3. Size/Designation — e.g. W24x76, C8x18.75, HSS10x10x375, L4x4x1/2. Treat the full designation as one field.
4. Shape — The physical form/category of the steel product. Use EXACTLY one of these values:
   - "Plate" — flat rolled sheet/plate, specified by thickness x width x length (e.g. 0.7500" x 96" x 240")
   - "I Beam" — wide flange beams, W-shapes (e.g. W24x76, W12x26)
   - "H Beam" — H-piles or HP shapes (e.g. HP10x42, HP12x53)
   - "Flat Bar" — flat bar stock, specified by thickness x width
   - "Channel" — C-shapes or MC-shapes (e.g. C8x18.75, MC10x8.4)
   - "Angle" — L-shapes (e.g. L4x4x1/2, L6x4x5/8)
   - "Pipe" — round pipe or tube (e.g. NPS 6, Pipe 4" STD)
   - "Coil" — coiled steel
   - "Round" — round bar stock (e.g. 1-1/2" RD BAR)
   - "Square" — square HSS/tube (e.g. HSS10SQx375, TS4x4x1/4)
   - "HSS Rectangle" — rectangular HSS/tube (e.g. HSS8x4x1/4)
   Determine shape from the size designation and any descriptive text. If unclear, leave blank.
5. Grade — e.g. Grade 50W, Grade B, Grade 36. If combined with spec (e.g. "A588 Grade B"), separate them.
6. Chemistry (per heat) — C, Mn, P, S, Si, Cu, Ni, Cr, V, Mo, Nb, CE if present
7. Country of Origin — USA, Canada, etc. Look for "Buy America", "Build America", "Produced in USA", "Country of Origin"
8. Mechanical Properties — Yield, Tensile, Elongation if present
9. CVN (Charpy V-Notch) — Extract ALL Charpy V-Notch impact test data if present. This is VERY important. Include temperature, energy values (ft-lbs or Joules), and any acceptance criteria.
10. Killed Fine Grain Practice — Look for "fully killed", "killed steel", "fine grain practice", "fine-grain", "ASTM A6". Report true/false based on whether the MTR states this.
11. No Weld Repair — Look for "no weld repair", "no repair welding", "no welding repair". Report true/false based on whether the MTR states this.

Return a JSON object with this structure:
{
  "heatNumbers": ["627779", "627781"],
  "specifications": ["A709"],
  "grade": "50W",
  "sizes": ["W24x76"],
  "shape": "I Beam",
  "materialType": "",
  "countryOfOrigin": "USA",
  "chemistryByHeat": {
    "627779": {"C": 0.09, "Mn": 1.25, "P": 0.017, "S": 0.015, "Si": 0.27, "Cu": 0.28, "Ni": 0.31, "Cr": 0.46, "V": 0.04, "Mo": 0.04, "Nb": 0.002, "CE": 0.44}
  },
  "mechanicalProperties": {
    "627779": {"yield": "", "tensile": "", "elongation": ""}
  },
  "cvnByHeat": {
    "627779": {"temperature": "-40F", "energy_ft_lbs": "12, 15, 14", "acceptance": "15J avg"}
  },
  "killedFineGrainPractice": true,
  "noWeldRepair": true,
  "notes": "",
  "extractionConfidence": "high|medium|low"
}

RULES:
- Do NOT guess or fabricate data. If a field is not present, leave it empty/null.
- If OCR misread a value (e.g. "AS88" should be "A588"), correct it.
- Extract ALL heat numbers — do not cap at 2.
- Do NOT confuse heat numbers with work order (WO) numbers, lot numbers, or order numbers.
- Shape must be one of: Plate, I Beam, H Beam, Flat Bar, Channel, Angle, Pipe, Coil, Round, Square, HSS Rectangle. If none match, leave blank.
- killedFineGrainPractice: true if the MTR states "fully killed", "killed steel", or "fine grain practice". false if not stated.
- noWeldRepair: true if the MTR states "no weld repair" or similar. false if not stated.
- CVN is critical — if present, extract all data including temperature, energy values, and acceptance criteria.
- If the document is not an MTR, return {"extractionConfidence": "not_an_mtr"}.
- Return ONLY valid JSON, no markdown.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `File: ${fileName}\n\nMTR TEXT:\n${fullText}` },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText.substring(0, 200)}`);
  }

  const result: any = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { raw: cleaned, parseError: true, extractionConfidence: 'low' };
  }
}
