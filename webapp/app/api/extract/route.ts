import { NextRequest, NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Code-Specific Chemistry Limits ───

const CODE_LIMITS: Record<string, {
  name: string;
  elements: Record<string, { max?: number; min?: number; label: string; desc: string }>;
  ceMax: number;
  ceFormula: string;
  ceDesc: string;
  notes: string;
}> = {
  'AWS D1.1': {
    name: 'AWS D1.1 — Structural Welding Code (Steel)',
    elements: {
      C:  { max: 0.12, label: '≤ 0.12%', desc: 'Controls weldability. Higher carbon increases hardness and cracking risk.' },
      Mn: { max: 1.25, label: '≤ 1.25%', desc: 'Affects strength and hardenability. Excess can cause welding issues.' },
      P:  { max: 0.04, label: '≤ 0.04%', desc: 'Phosphorus reduces ductility and toughness. Must be minimized.' },
      S:  { max: 0.05, label: '≤ 0.05%', desc: 'Sulfur causes hot shortness and reduces weldability.' },
      Si: { min: 0.15, max: 0.50, label: '0.15–0.50%', desc: 'Deoxidizer. Required for killed steel practice.' },
      Cu: { min: 0.20, label: '≥ 0.20%', desc: 'Required for weathering steel corrosion resistance.' },
      CE: { max: 0.47, label: '≤ 0.47%', desc: 'Carbon Equivalent — determines preheat requirements for prequalified WPS.' },
    },
    ceMax: 0.47,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'If CE > 0.47, preheat is required per Table 3.2. CE > 0.57 may not be prequalified.',
    notes: 'AWS D1.1 covers structural steel welding for buildings, not bridges. CE limit ensures prequalified WPS status.',
  },
  'AWS D1.5': {
    name: 'AWS D1.5 — Bridge Welding Code',
    elements: {
      C:  { max: 0.12, label: '≤ 0.12% (Cl 5.4.2)', desc: 'Mandatory limit for Grade 50W. Controls HAZ hardness and weldability.' },
      Mn: { max: 1.25, label: '≤ 1.25% (A709 Table 4)', desc: 'Max for flange ≤ 3/4". Higher Mn allowed for thicker sections per Table 4.' },
      P:  { max: 0.04, label: '≤ 0.04%', desc: 'Reduces toughness and ductility. Bridge steel requires low phosphorus.' },
      S:  { max: 0.05, label: '≤ 0.05%', desc: 'Causes lamellar tearing and hot cracking in welds.' },
      Si: { min: 0.15, max: 0.50, label: '0.15–0.50%', desc: 'Required for killed steel. Indicates deoxidized, fine-grain practice.' },
      Cu: { min: 0.20, label: '≥ 0.20%', desc: 'Essential for weathering steel (A588/A709 Gr 50W) atmospheric corrosion resistance.' },
      Ni: { max: 0.50, label: '≤ 0.50%', desc: 'Improves toughness. Typical range for weathering grades.' },
      Cr: { max: 0.60, label: '≤ 0.60%', desc: 'Enhances corrosion resistance in weathering steel.' },
      V:  { max: 0.06, label: '≤ 0.06%', desc: 'Grain refiner. Improves strength but must be controlled for weldability.' },
      CE: { max: 0.47, label: '≤ 0.47% (Cl 5.4.2)', desc: 'Carbon Equivalent limit for bridge welds. Exceeding requires engineering approval.' },
    },
    ceMax: 0.47,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'CE > 0.47 requires special WPS qualification per Clause 5. Maximum 0.55 for any bridge steel.',
    notes: 'AWS D1.5 governs all bridge welding in the US. A709 Grade 50W is the primary weathering bridge steel spec. Killed fine grain practice and no weld repair are mandatory statements.',
  },
  'ASME': {
    name: 'ASME BPVC — Boiler & Pressure Vessel Code',
    elements: {
      C:  { max: 0.30, label: '≤ 0.30% (SA-106 Gr.B)', desc: 'Varies by spec: SA-106 Gr.A ≤0.25%, Gr.B ≤0.30%, Gr.C ≤0.35%. SA-516 Gr.70 ≤0.27%.' },
      Mn: { min: 0.29, max: 1.06, label: '0.29–1.06% (SA-106 Gr.B)', desc: 'Range varies by spec. SA-516 Gr.70: 0.85–1.20%. P-alloy: 0.30–0.60%.' },
      P:  { max: 0.035, label: '≤ 0.035%', desc: 'Tighter than structural steel. Pressure applications require very low phosphorus.' },
      S:  { max: 0.035, label: '≤ 0.035%', desc: 'Tighter than structural steel. Reduces hot shortness in pressure equipment.' },
      Si: { min: 0.10, max: 0.30, label: '0.10–0.30%', desc: 'Required for killed steel practice in pressure applications.' },
      Cr: { max: 0.30, label: '≤ 0.30% (low alloy)', desc: 'SA-335 P11: 1.00–1.50%. Chrome-moly alloys have higher Cr for creep resistance.' },
      Mo: { max: 0.10, label: '≤ 0.10% (carbon steel)', desc: 'SA-335 P11: 0.44–0.65%. Molybdenum improves high-temperature strength.' },
      CE: { max: 0.43, label: '≤ 0.43%', desc: 'General CE limit for ASME materials. Individual specs may have tighter requirements.' },
    },
    ceMax: 0.43,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'CE limits vary by material spec. SA-516 typically ≤0.45%. Low-alloy specs have specific limits.',
    notes: 'ASME BPVC Section IX governs welding qualifications. Material specs in Section II (SA- prefix). P-Number grouping determines WPS requirements. Chemistry limits vary significantly by specific spec — verify against the actual material grade.',
  },
  'API': {
    name: 'API 5L — Pipeline Steel (American Petroleum Institute)',
    elements: {
      C:  { max: 0.26, label: '≤ 0.26% (PSL1)', desc: 'PSL1: ≤0.26%. PSL2: ≤0.24% for most grades. Lower carbon improves field weldability.' },
      Mn: { max: 1.35, label: '≤ 1.35% (PSL1)', desc: 'PSL1: ≤1.35%. PSL2: ≤1.40%. Pipeline steel uses higher Mn for strength.' },
      P:  { max: 0.030, label: '≤ 0.030% (PSL1)', desc: 'PSL1: ≤0.030%. PSL2: ≤0.025%. Very tight phosphorus for sour service.' },
      S:  { max: 0.030, label: '≤ 0.030% (PSL1)', desc: 'PSL1: ≤0.030%. PSL2: ≤0.015%. Sour service (HIC/SWC) requires ≤0.002%.' },
      V:  { max: 0.04, label: '≤ 0.04%', desc: 'Vanadium is a grain refiner. Combined with Nb and Ti, total ≤0.15%.' },
      Nb: { max: 0.04, label: '≤ 0.04%', desc: 'Niobium (columbium) for microalloyed pipeline steel.' },
      Ti: { max: 0.04, label: '≤ 0.04%', desc: 'Titanium for nitrogen control. V+Nb+Ti total ≤0.15%.' },
      CE: { max: 0.43, label: '≤ 0.43% (PSL2)', desc: 'PSL2 CE ≤0.43%. Alternatively, PCM ≤0.25% for crack susceptibility.' },
    },
    ceMax: 0.43,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'PSL2 requires CE ≤0.43% OR PCM ≤0.25%. PCM formula: C + Si/30 + Mn/20 + Cu/20 + Ni/60 + Cr/20 + Mo/15 + V/10 + 5B.',
    notes: 'API 5L covers pipeline steel. PSL1 (Product Specification Level 1) is standard. PSL2 has stricter chemistry and CVN requirements. Sour service (NACE MR0175) has additional restrictions on S and P.',
  },
};

// ─── Code-specific GPT-4o prompt additions ───

function getCodePromptSection(code: string): string {
  switch (code) {
    case 'AWS D1.1':
      return `GOVERNING CODE: AWS D1.1 — Structural Welding Code (Steel)
- Focus on structural steel specs: A36, A588, A992, A500, A53, A513.
- CE limit ≤ 0.47% for prequalified WPS (Table 3.2).
- Look for "Buy America" compliance statements.
- Killed fine grain practice per ASTM A6.
- No weld repair statement.`;

    case 'AWS D1.5':
      return `GOVERNING CODE: AWS D1.5 — Bridge Welding Code
- Focus on bridge steel: A709 Grade 50W, A588 weathering steel.
- C ≤ 0.12% (Clause 5.4.2), Mn ≤ 1.25% (A709 Table 4), CE ≤ 0.47%.
- "Buy America" / "Build America" compliance is mandatory.
- Killed fine grain practice is REQUIRED per ASTM A6.
- No weld repair statement is REQUIRED.`;

    case 'ASME':
      return `GOVERNING CODE: ASME BPVC — Boiler & Pressure Vessel Code
- Focus on pressure equipment specs: SA-106, SA-516, SA-335, SA-240, SA-182, SA-234.
- Specs use SA- prefix (ASME equivalent of ASTM A- prefix).
- P ≤ 0.035%, S ≤ 0.035% (tighter than structural steel).
- Material may have P-Number grouping (e.g., P-No.1 for carbon steel, P-No.4 for low alloy).
- Do NOT look for "Buy America" — not relevant for pressure vessels.
- Look for "fully killed" or "fine grain practice" per SA-20.
- ASME welding governed by Section IX — QW-470 chemistry requirements may apply.`;

    case 'API':
      return `GOVERNING CODE: API 5L — Pipeline Steel
- Focus on pipeline specs: API 5L (grades X42 through X80), PSL1 and PSL2.
- C ≤ 0.26% (PSL1), C ≤ 0.24% (PSL2).
- P ≤ 0.030% (PSL1), P ≤ 0.025% (PSL2).
- S ≤ 0.030% (PSL1), S ≤ 0.015% (PSL2). Sour service requires even lower S.
- Look for PSL designation (PSL1 or PSL2).
- CE ≤ 0.43% or PCM ≤ 0.25% (PSL2).
- CVN impact testing is mandatory for PSL2.
- Do NOT look for "Buy America" — not relevant for pipeline steel.
- Look for "sour service" designation if applicable (NACE MR0175).`;

    default:
      return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const code = (formData.get('code') as string) || 'AWS D1.5';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: 'Only PDF files are supported' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let fullText = '';
    let extractionMethod = 'text';

    try {
      fullText = await extractPdfText(bytes);
    } catch (e) {
      console.error('Text extraction failed, will try OCR:', e);
    }

    if (!fullText || fullText.trim().length < 50) {
      extractionMethod = 'textract';
      fullText = await callTextract(bytes);
    }

    const extractedData = await callGPT4o(fullText, file.name, code);

    if (extractedData.specifications) {
      extractedData.materialType = deriveMaterialType(extractedData.specifications);
    }

    if (!extractedData.shape && extractedData.sizes) {
      extractedData.shape = deriveShape(extractedData.sizes, fullText);
    }

    return NextResponse.json({
      success: true,
      extractionMethod,
      textLength: fullText.length,
      code,
      codeLimits: CODE_LIMITS[code] || CODE_LIMITS['AWS D1.5'],
      extractedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error';
    console.error('Extraction error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function deriveMaterialType(specs: string[]): string {
  const specStr = specs.join(' ').toUpperCase();
  if (specStr.includes('A588') || specStr.includes('A709') || specStr.includes('709')) return 'Weathering Steel';
  if (specStr.includes('A500')) return 'A500';
  if (specStr.includes('A36') || specStr.includes('SA36') || specStr.includes('SA-36')) return 'A36';
  if (specStr.includes('A992')) return 'A992';
  if (specStr.includes('L304') || specStr.includes('304') || specStr.includes('S304') || specStr.includes('STAINLESS') || specStr.includes('SA-240')) return 'Stainless Steel';
  if (specStr.includes('A53') || specStr.includes('SA-106')) return 'Carbon Steel Pipe';
  if (specStr.includes('A513')) return 'A513';
  if (specStr.includes('SA-516') || specStr.includes('SA516')) return 'Pressure Vessel Plate';
  if (specStr.includes('SA-335') || specStr.includes('SA335')) return 'Chrome-Moly Alloy';
  if (specStr.includes('API 5L') || specStr.includes('5L')) return 'Pipeline Steel';
  return '';
}

function deriveShape(sizes: string[], fullText: string): string {
  const text = fullText.toUpperCase();
  const sizeStr = sizes.join(' ').toUpperCase();
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

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  const textChunks: string[] = [];
  const btEtRegex = /BT\s+([\s\S]*?)\s+ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const textObj = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    const tjMatch = tjRegex.exec(textObj);
    if (tjMatch) textChunks.push(tjMatch[1]);
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

async function callTextract(bytes: Uint8Array): Promise<string> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const region = process.env.AWS_REGION || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. This scanned PDF requires Textract OCR.');
  }
  const client = new TextractClient({ region, credentials: { accessKeyId, secretAccessKey } });
  const pageBytes = await splitPdfPages(bytes);
  const allText: string[] = [];
  for (let i = 0; i < Math.min(pageBytes.length, 3); i++) {
    const command = new DetectDocumentTextCommand({ Document: { Bytes: pageBytes[i] } });
    const result: any = await client.send(command);
    const blocks: any[] = result.Blocks || [];
    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) allText.push(block.Text);
    }
  }
  const text = allText.join('\n');
  if (!text || text.trim().length < 50) throw new Error('Could not extract text from this PDF.');
  return text;
}

async function splitPdfPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  if (pageCount <= 1) return [bytes];
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

async function callGPT4o(fullText: string, fileName: string, code: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY?.replace(/['"]/g, '').trim();
  if (!apiKey) throw new Error('OpenAI API key not configured.');

  const codeSection = getCodePromptSection(code);

  const systemPrompt = `You are an expert metallurgical QA/QC inspector specializing in Mill Test Reports (MTRs). Extract ALL data from the MTR text provided below.

${codeSection}

CRITICAL FIELDS (in priority order):
1. Heat Numbers — THE most important field. There may be 3-5+ heats on a single page. Extract ALL of them.
   - Heat numbers are typically 5-8 digit numbers associated with chemistry data.
   - They are NOT work order numbers, PO numbers, or order numbers.
   - If a number is labeled "WO", "Work Order", "Order", "Lot" — that is NOT a heat number.
2. Specification — e.g. ASTM A588, A709, A500, A36, A992, SA-106, SA-516, API 5L. Do NOT guess.
3. Size/Designation — e.g. W24x76, C8x18.75, HSS10x10x375, L4x4x1/2, NPS 6.
4. Shape — The physical form/category. Use one of: Plate, I Beam, H Beam, Flat Bar, Channel, Angle, Pipe, Coil, Round, Square, HSS Rectangle.
   - Plate: thickness x width x length (e.g. 0.7500" x 96" x 240")
   - I Beam: W-shapes (e.g. W24x76)
   - H Beam: HP shapes (e.g. HP10x42)
   - Channel: C or MC shapes
   - Angle: L-shapes
   - Pipe: NPS, SCH, or pipe designations
   - Determine from size designation and descriptive text.
5. Grade — e.g. Grade 50W, Grade B, Grade 36, X52, B. Separate from spec if combined.
6. Chemistry (per heat) — C, Mn, P, S, Si, Cu, Ni, Cr, V, Mo, Nb, Ti, CE if present.
7. Country of Origin — USA, Canada, etc.
8. Mechanical Properties — Yield, Tensile, Elongation if present.
9. CVN (Charpy V-Notch) — Extract ALL impact test data. Temperature, energy (ft-lbs/Joules), acceptance.
10. Killed Fine Grain Practice — "fully killed", "killed steel", "fine grain practice". true/false.
11. No Weld Repair — "no weld repair", "no repair welding". true/false.
12. PSL Designation (API only) — PSL1 or PSL2 if present.

Return a JSON object with this structure:
{
  "heatNumbers": ["627779"],
  "specifications": ["A709"],
  "grade": "50W",
  "sizes": ["W24x76"],
  "shape": "I Beam",
  "materialType": "",
  "countryOfOrigin": "USA",
  "psl": "",
  "chemistryByHeat": {
    "627779": {"C": 0.09, "Mn": 1.25, "P": 0.017, "S": 0.015, "Si": 0.27, "Cu": 0.28, "Ni": 0.31, "Cr": 0.46, "V": 0.04, "Mo": 0.04, "Nb": 0.002, "CE": 0.44}
  },
  "mechanicalProperties": {
    "627779": {"yield": "", "tensile": "", "elongation": ""}
  },
  "cvnByHeat": {
    "627779": {"temperature": "-40F", "energy_ft_lbs": "12, 15, 14", "acceptance": ""}
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
- Shape must be one of: Plate, I Beam, H Beam, Flat Bar, Channel, Angle, Pipe, Coil, Round, Square, HSS Rectangle.
- killedFineGrainPractice: true only if the MTR explicitly states this. false if not stated.
- noWeldRepair: true only if the MTR explicitly states this. false if not stated.
- CVN is critical — extract all data including temperature, energy values, and acceptance criteria.
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
