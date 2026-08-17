import { NextRequest, NextResponse } from 'next/server';
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

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Extract text from PDF
    let fullText = '';
    let extractionMethod = 'text';

    try {
      fullText = await extractPdfText(bytes);
    } catch (e) {
      console.error('Text extraction failed:', e);
    }

    if (!fullText || fullText.trim().length < 50) {
      // Try Textract OCR for scanned drawings
      extractionMethod = 'textract';
      try {
        fullText = await callTextract(bytes);
      } catch (err) {
        console.error('Textract failed:', err);
        return NextResponse.json({
          success: false,
          error: 'Could not extract text from this drawing. Ensure it is a readable PDF.',
        }, { status: 500 });
      }
    }

    // Use GPT-4o to parse drawing data
    const drawingData = await callGPT4oDrawing(fullText, file.name);

    return NextResponse.json({
      success: true,
      extractionMethod,
      textLength: fullText.length,
      drawingData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Drawing extraction error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
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
  const { TextractClient, DetectDocumentTextCommand } = await import('@aws-sdk/client-textract');
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.replace(/['"]/g, '').trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.replace(/['"]/g, '').trim();
  const region = process.env.AWS_REGION || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) throw new Error('AWS credentials not configured');
  const client = new TextractClient({ region, credentials: { accessKeyId, secretAccessKey } });
  const pageBytes = await splitPdfPages(bytes);
  const allText: string[] = [];
  for (let i = 0; i < Math.min(pageBytes.length, 5); i++) {
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

async function callGPT4oDrawing(fullText: string, fileName: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY?.replace(/['"]/g, '').trim();
  if (!apiKey) throw new Error('OpenAI API key not configured.');

  const systemPrompt = `You are an expert structural engineer and AISC-certified QC manager analyzing a structural drawing for a pedestrian bridge or trail structure.

Extract ALL of the following information from the drawing text:

1. JOB INFORMATION
   - Job Number (e.g., 838093-010)
   - Job Name (e.g., "Coyote Creek State Park")
   - Structure Type: Must be one of: Truss, Bolted Truss, Modular, Tower, Railing, Landing
   - Material: Weathering, Painted - G50, Painted - A500, Galvanized, Galvanized - Painted, Metalized - Painted, Aluminum
   - Welding Code & Process: e.g., "AWS D1.5 - FCAW", "AWS D1.1 - FCAW", "AWS D1.1 - GMAW"
   - Bridge ID (if shown on plaque or title block)

2. DIMENSIONS (extract from drawing)
   - Bridge/Bearing Length (e.g., "42'-0\"")
   - Camber (e.g., "MILL UP" or a measurement)
   - Rail Height (e.g., "4'-0\"")
   - Deck Width (e.g., "16'")
   - Diaphragm Spacing (e.g., "19\"")
   - Post Block Spacing (e.g., "4'-7 5/8\"")
   - Side Dam Height, End Dam Height
   - Overall Height (for towers)
   - Top Width, Bearing Width
   - Any other critical dimensions shown

3. PLAQUE INFORMATION
   - Design Load (e.g., "HL-93", "Pedestrian", "Vehicle")
   - Load Limit (if specified, in lbs or tons)
   - Bridge ID number

4. PARTS AND MATERIALS
   - List all parts with their material sizes (e.g., "W24x76", "C8x18.75", "HSS10x10x375", "PL 3/4")
   - Any material specifications referenced (A588, A709, A500, A36, A992)

5. WELDING INFORMATION
   - Weld symbols shown (CJP, Fillet, PJP)
   - NDT requirements (UT, MT)
   - Weld process (FCAW, GMAW, SMAW)

6. AISC COMPLIANCE NOTES
   - Any AISC 360 references
   - Any fracture critical member designations
   - Bolt pretensioning requirements (SC, TC, A325, A490)
   - Stud requirements (number, layout, spacing)

Return JSON with this structure:
{
  "jobNumber": "838093-010",
  "jobName": "Coyote Creek State Park",
  "structureType": "Modular",
  "material": "Weathering",
  "weldingCode": "AWS D1.5 - FCAW",
  "bridgeId": "",
  "dimensions": {
    "bridgeLength": "42'-0\"",
    "camber": "MILL UP",
    "railHeight": "4'-0\"",
    "deckWidth": "16'",
    "diaphragmSpacing": "19\"",
    "postBlockSpacing": "4'-7 5/8\"",
    "sideDamHeight": "3-1/2\"",
    "endDamHeight": "N/A",
    "overallHeight": "",
    "topWidth": "",
    "bearingWidth": "",
    "otherDims": {}
  },
  "plaque": {
    "designLoad": "HL-93",
    "loadLimit": "",
    "bridgeId": ""
  },
  "parts": [
    {"name": "Stringers", "size": "W24x76", "material": "A709"},
    {"name": "Diaphrams", "size": "C8x18.75", "material": "A588"}
  ],
  "welding": {
    "weldTypes": ["CJP", "Fillet"],
    "ndtRequirements": ["Visual", "UT", "MT"],
    "process": "FCAW"
  },
  "bolts": {
    "type": "A325",
    "pretension": "SC",
    "qty": ""
  },
  "studs": {
    "qty": "",
    "layout": "",
    "spacing": ""
  },
  "aiscNotes": ["AISC 360 Ch N reference", "Fracture critical: N/A"],
  "extractionConfidence": "high|medium|low"
}

RULES:
- Do NOT guess. If a field is not present, leave it empty.
- Extract ALL dimensions visible on the drawing.
- Material type must match the company's standard options (Weathering, Painted-G50, Painted-A500, Galvanized, etc.)
- Structure type must be one of: Truss, Bolted Truss, Modular, Tower, Railing, Landing
- Welding code format: "AWS D1.X - PROCESS" (e.g., "AWS D1.5 - FCAW")
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
        { role: 'user', content: `File: ${fileName}\n\nDRAWING TEXT:\n${fullText}` },
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
