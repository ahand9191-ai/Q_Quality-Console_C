import { NextRequest, NextResponse } from 'next/server';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Split multi-page PDFs into individual pages, then Textract each page
    const textractResult = await callTextract(bytes);

    // Step 2: GPT-4o — structured field extraction
    const extractedData = await callGPT4o(textractResult, file.name);

    return NextResponse.json({
      success: true,
      textractRaw: {
        fullText: textractResult.fullText,
        blockCount: textractResult.blockCount,
        pagesProcessed: textractResult.pagesProcessed,
      },
      extractedData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error';
    console.error('Extraction error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── Split PDF into individual pages ───

async function splitPdfPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(bytes);
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

// ─── AWS Textract via SDK (multi-page aware) ───

async function callTextract(bytes: Uint8Array): Promise<{
  fullText: string;
  tables: string[][][];
  blockCount: number;
  pagesProcessed: number;
}> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Vercel env vars.');
  }

  const client = new TextractClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  // Split multi-page PDFs into single pages — AnalyzeDocument only supports 1 page at a time
  const pageBytes = await splitPdfPages(bytes);
  const allLines: string[] = [];
  const allTables: string[][][] = [];
  let totalBlocks = 0;

  for (let pageNum = 0; pageNum < pageBytes.length; pageNum++) {
    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: pageBytes[pageNum] },
      FeatureTypes: ['TABLES', 'FORMS', 'LAYOUT'],
    });

    const result: any = await client.send(command);
    const blocks: any[] = result.Blocks || [];

    const blockMap: Map<string, any> = new Map();
    for (const b of blocks) {
      blockMap.set(b.Id, b);
    }

    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        allLines.push(block.Text);
      }
    }

    for (const block of blocks) {
      if (block.BlockType === 'TABLE') {
        const tableData = extractTable(block, blockMap);
        if (tableData.length > 0) allTables.push(tableData);
      }
    }

    totalBlocks += blocks.length;
  }

  return {
    fullText: allLines.join('\n'),
    tables: allTables,
    blockCount: totalBlocks,
    pagesProcessed: pageBytes.length,
  };
}

function extractTable(tableBlock: any, blockMap: Map<string, any>): string[][] {
  const rows: string[][] = [];
  const rel = tableBlock.Relationships?.find((r: any) => r.Type === 'CHILD');
  if (!rel) return rows;

  for (const cellId of rel.Ids) {
    const cell = blockMap.get(cellId);
    if (cell && cell.BlockType === 'CELL') {
      const r = (cell.RowIndex || 1) - 1;
      const c = (cell.ColumnIndex || 1) - 1;
      const text = getCellText(cell, blockMap);
      if (!rows[r]) rows[r] = [];
      rows[r][c] = text;
    }
  }
  return rows.filter((r) => r && r.length > 0);
}

function getCellText(cell: any, blockMap: Map<string, any>): string {
  const rel = cell.Relationships?.find((r: any) => r.Type === 'CHILD');
  if (!rel) return '';
  const words: string[] = [];
  for (const wordId of rel.Ids) {
    const word = blockMap.get(wordId);
    if (word?.Text) words.push(word.Text);
  }
  return words.join(' ');
}

// ─── GPT-4o structured extraction ───

async function callGPT4o(
  textractData: { fullText: string; tables: string[][][] },
  fileName: string
): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY?.replace(/['"]/g, '').trim();
  if (!apiKey) throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in Vercel env vars.');

  const tableText = (textractData.tables || [])
    .map((table, i) => `Table ${i + 1}:\n${table.map((row) => row.join(' | ')).join('\n')}`)
    .join('\n\n');

  const combinedText = `${textractData.fullText}\n\n${tableText}`;

  const systemPrompt = `You are an expert metallurgical QA/QC inspector specializing in structural steel Mill Test Reports (MTRs) for bridge construction. Extract ALL data from the MTR text provided below (sourced from AWS Textract OCR).

CRITICAL FIELDS (in priority order):
1. Heat Numbers — THE most important field. There may be 3-5+ heats on a single page. Extract ALL of them.
   - Heat numbers are typically 5-8 digit numbers associated with chemistry data (C, Mn, P, S, etc.)
   - They are NOT work order numbers, PO numbers, or order numbers.
   - Heat numbers usually appear near or above the chemistry table rows.
   - If a number is labeled "WO", "Work Order", "Order", "Lot" — that is NOT a heat number.
   - Only extract numbers that are clearly labeled as "Heat", "Heat No", "Heat Number", or appear as the identifier in a chemistry table row.
2. Specification — e.g. ASTM A588, A709, A500, A36, A992. Do NOT guess. If unclear, leave blank.
3. Size/Type — e.g. W24x76, C8x18.75, HSS10x10x375, L4x4x1/2. Treat the full designation as one field.
4. Grade — e.g. Grade 50W, Grade B, Grade 36. If combined with spec (e.g. "A588 Grade B"), separate them.
5. Chemistry (per heat) — C, Mn, P, S, Si, Cu, Ni, Cr, V, Mo, Nb, CE if present
6. Country of Origin — USA, Canada, etc. Look for "Buy America", "Build America", "Produced in USA", "Country of Origin"
7. Mechanical Properties — Yield, Tensile, Elongation, CVN (Charpy V-Notch) if present
8. Purchase Order (PO) Number
9. Quantity
10. Material Type — beam, channel, angle, plate, HSS, pipe, etc. Do NOT default to beam. Leave blank if unknown.

Return a JSON object with this structure:
{
  "heatNumbers": ["627779", "627781"],
  "specifications": ["A709"],
  "grade": "50W",
  "sizes": ["W24x76"],
  "materialType": "beam",
  "countryOfOrigin": "USA",
  "poNumber": "1867667",
  "quantity": "",
  "chemistryByHeat": {
    "627779": {"C": 0.09, "Mn": 1.25, "P": 0.017, "S": 0.015, "Si": 0.27, "Cu": 0.28, "Ni": 0.31, "Cr": 0.46, "V": 0.04, "Mo": 0.04, "Nb": 0.002, "CE": 0.44}
  },
  "mechanicalProperties": {
    "627779": {"yield": "", "tensile": "", "elongation": "", "cvn": ""}
  },
  "notes": "",
  "extractionConfidence": "high|medium|low"
}

RULES:
- Do NOT guess or fabricate data. If a field is not present, leave it empty/null.
- If Textract misread a value (e.g. "AS88" should be "A588"), correct it.
- Extract ALL heat numbers — do not cap at 2.
- Do NOT confuse heat numbers with work order (WO) numbers, lot numbers, or order numbers.
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
        { role: 'user', content: `File: ${fileName}\n\nTEXTRACT OCR OUTPUT:\n${combinedText}` },
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
