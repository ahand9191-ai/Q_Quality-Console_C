// Dual-layer MTR extraction: AWS Textract (OCR) + OpenAI GPT-4o (intelligence)
// Uses raw HTTP calls with AWS SigV4 signing - no SDK needed

import crypto from 'node:crypto';

export default async function extractMtrWithAI(req: any): Promise<any> {
  // Handle both req.body and direct payload
  const payload = req?.body || req || {};
  const { documentUrl, documentBase64, documentType } = payload;

  if (!documentUrl && !documentBase64) {
    return { success: false, error: 'Either documentUrl or documentBase64 is required' };
  }

  try {
    // Step 1: Call AWS Textract to extract text and tables
    const textractResponse = await callTextract(documentUrl, documentBase64);

    // Step 2: Send to GPT-4o for structured extraction
    const extractedData = await callGPT4o(textractResponse, documentUrl, documentType);

    return {
      success: true,
      textractRaw: textractResponse,
      extractedData
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

// AWS SigV4 signing + Textract call via raw HTTP
async function callTextract(documentUrl?: string, documentBase64?: string): Promise<any> {
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').replace(/['"]/g, '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').replace(/['"]/g, '').trim();
  const region = 'us-east-1';
  const service = 'textract';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  // Fetch document bytes
  let bytes: Uint8Array;
  if (documentBase64) {
    const raw = atob(documentBase64);
    bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  } else if (documentUrl) {
    const resp = await fetch(documentUrl);
    const arrayBuffer = await resp.arrayBuffer();
    bytes = new Uint8Array(arrayBuffer);
  } else {
    throw new Error('Either documentUrl or documentBase64 required');
  }

  // Convert to base64 for the API call
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  const base64Data = btoa(binary);

  const payloadBody = JSON.stringify({
    Document: { Bytes: base64Data },
    FeatureTypes: ['TABLES', 'FORMS', 'LAYOUT']
  });

  // Build SigV4 signature
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:textract.${region}.amazonaws.com\nx-amz-date:${amzDate}\nx-amz-target:Textract.AnalyzeDocument\n`;
  const canonicalRequest = [
    'POST',
    '/',
    '',
    canonicalHeaders,
    'content-type;host;x-amz-date;x-amz-target',
    crypto.createHash('sha256').update(payloadBody).digest('hex')
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const getSignatureKey = (key: string, date: string, reg: string, svc: string) => {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(date).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(reg).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(svc).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  };

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=${signature}`;

  const textractResp = await fetch(`https://textract.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'Textract.AnalyzeDocument',
      'Authorization': authorizationHeader
    },
    body: payloadBody
  });

  const result: any = await textractResp.json();

  if (!result.Blocks) {
    throw new Error(`Textract error: ${JSON.stringify(result)}`);
  }

  // Extract lines and tables
  const blocks = result.Blocks || [];
  const lines: string[] = [];
  const tables: any[][][] = [];
  const blockMap = new Map(blocks.map((b: any) => [b.Id, b]));

  for (const block of blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
    }
  }

  for (const block of blocks) {
    if (block.BlockType === 'TABLE') {
      const tableData = extractTable(block, blockMap);
      if (tableData.length > 0) tables.push(tableData);
    }
  }

  return {
    fullText: lines.join('\n'),
    tables: tables,
    blockCount: blocks.length
  };
}

function extractTable(tableBlock: any, blockMap: Map<string, any>): any[][] {
  const rows: any[][] = [];
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
  return rows.filter(r => r && r.length > 0);
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

// GPT-4o structured extraction
async function callGPT4o(textractData: any, documentUrl?: string, documentType?: string): Promise<any> {
  const apiKey = (process.env.OPENAI_API_KEY || '').replace(/['"]/g, '').trim();
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const textractText = textractData.fullText || '';
  const tableText = (textractData.tables || []).map((table: any, i: number) =>
    `Table ${i + 1}:\n${table.map((row: any) => row.join(' | ')).join('\n')}`
  ).join('\n\n');

  const combinedText = `${textractText}\n\n${tableText}`;

  const systemPrompt = `You are an expert metallurgical QA/QC inspector specializing in structural steel Mill Test Reports (MTRs) for bridge construction. Extract ALL data from the MTR text provided below (sourced from AWS Textract OCR).

CRITICAL FIELDS (in priority order):
1. Heat Numbers — THE most important field. There may be 3-5+ heats on a single page. Extract ALL of them.
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
- If the document is not an MTR, return {"extractionConfidence": "not_an_mtr"}.
- Return ONLY valid JSON, no markdown.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Document URL: ${documentUrl || 'N/A'}\nDocument Type: ${documentType || 'MTR'}\n\nTEXTRACT OCR OUTPUT:\n${combinedText}` }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })
  });

  const result: any = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { raw: cleaned, parseError: true };
  }
}
