interface ExtractMtrRequest {
  fileUrl?: string;
  fileName?: string;
}

interface ExtractMtrResponse {
  success: boolean;
  heatNumbers: string[];
  specifications: string[];
  grade: string;
  materialType: string;
  size: string;
  chemistryByHeat: Record<string, any>;
  mechanical: any;
  cvn: any;
  killedFineGrain: boolean;
  noWeldRepair: boolean;
  countryOfOrigin: string;
  poNumber: string;
  rawText: string;
  notes: string;
  error?: string;
}

// AWS Textract Custom Queries — MTR-specific field extraction
const MTR_QUERIES = [
  "What is the heat number?",
  "What is the ASTM specification or material specification?",
  "What is the grade of the steel?",
  "What is the material type (beam, channel, angle, plate, HSS, sheet, coil, weld stud, flat bar)?",
  "What is the size or dimension of the material?",
  "What is the carbon (C) chemistry value?",
  "What is the manganese (Mn) chemistry value?",
  "What is the phosphorus (P) chemistry value?",
  "What is the sulfur (S) chemistry value?",
  "What is the silicon (Si) chemistry value?",
  "What is the copper (Cu) chemistry value?",
  "What is the chromium (Cr) chemistry value?",
  "What is the nickel (Ni) chemistry value?",
  "What is the vanadium (V) chemistry value?",
  "What is the molybdenum (Mo) chemistry value?",
  "What is the aluminum (Al) chemistry value?",
  "What is the carbon equivalent (CE or CEV)?",
  "What is the tensile strength?",
  "What is the yield strength?",
  "What is the elongation percentage?",
  "What are the Charpy V-notch impact test values?",
  "What is the country of origin or where was the steel melted and manufactured?",
  "What is the purchase order (PO) number?",
  "Does the document state 'fully killed' or 'fine grain practice'?",
  "Does the document state 'no weld repair' or 'free from repair welding'?",
];

export default async function extractMtr(req: ExtractMtrRequest): Promise<ExtractMtrResponse> {
  try {
    // Import AWS SDK
    const { TextractClient, AnalyzeDocumentCommand } = await import('@aws-sdk/client-textract');
    
    // Get AWS credentials from environment
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID_4 || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY_2 || process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      return { success: false, error: 'AWS credentials not configured', heatNumbers: [], specifications: [], grade: '', materialType: '', size: '', chemistryByHeat: {}, mechanical: {}, cvn: {}, killedFineGrain: false, noWeldRepair: false, countryOfOrigin: '', poNumber: '', rawText: '', notes: '' };
    }
    
    // Fetch the PDF from the provided URL
    const fileUrl = req.fileUrl;
    if (!fileUrl) {
      return { success: false, error: 'No file URL provided', heatNumbers: [], specifications: [], grade: '', materialType: '', size: '', chemistryByHeat: {}, mechanical: {}, cvn: {}, killedFineGrain: false, noWeldRepair: false, countryOfOrigin: '', poNumber: '', rawText: '', notes: '' };
    }
    
    // Download the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return { success: false, error: `Failed to download file: ${fileResponse.status}`, heatNumbers: [], specifications: [], grade: '', materialType: '', size: '', chemistryByHeat: {}, mechanical: {}, cvn: {}, killedFineGrain: false, noWeldRepair: false, countryOfOrigin: '', poNumber: '', rawText: '', notes: '' };
    }
    
    const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());
    
    // Initialize Textract client
    const textractClient = new TextractClient({
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
    });
    
    // Build query objects for Textract
    const queries = MTR_QUERIES.map(text => ({ Text: text }));
    
    // Call Textract with QUERIES feature
    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBytes },
      FeatureTypes: ['QUERIES', 'TABLES', 'LAYOUT'],
      QueriesConfig: { Queries: queries },
    });
    
    const textractResponse = await textractClient.send(command);
    
    // Extract query answers
    const queryAnswers: Record<string, string> = {};
    const blocks = textractResponse.Blocks || [];
    
    for (const block of blocks) {
      if (block.BlockType === 'QUERY_RESULT' && block.Text) {
        // Find the associated query
        const relationship = block.Relationships?.find(r => r.Type === 'CHILD');
        if (relationship && relationship.Ids) {
          const queryBlock = blocks.find(b => b.Id === relationship.Ids[0]);
          if (queryBlock && queryBlock.Query && queryBlock.Query.Text) {
            queryAnswers[queryBlock.Query.Text] = block.Text;
          }
        }
      }
    }
    
    // Also extract all text blocks for raw text
    const rawText = blocks
      .filter(b => b.BlockType === 'LINE' && b.Text)
      .map(b => b.Text)
      .join(' ');
    
    // Check for killed/fine grain and no weld repair in raw text
    const lowerText = rawText.toLowerCase();
    const killedFineGrain = /fully killed|fine grain|killed steel|fine grain practice|killed fine grain/i.test(rawText);
    const noWeldRepair = /no weld repair|no welding repair|no repair welding|contains no weld repair|free from repair welding|no weld repairs/i.test(rawText);
    
    // Parse chemistry values
    const parseChem = (val: string | undefined): number | null => {
      if (!val) return null;
      const match = val.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    };
    
    // Extract heat numbers (can be multiple)
    const heatText = queryAnswers["What is the heat number?"] || '';
    const heatNumbers = heatText.split(/[,;]|(?:\band\b)/i).map(h => h.trim()).filter(h => h.length > 0);
    
    // Build chemistry by heat
    const chemistryByHeat: Record<string, any> = {};
    for (const heat of heatNumbers.length > 0 ? heatNumbers : ['UNKNOWN']) {
      chemistryByHeat[heat] = {
        C: parseChem(queryAnswers["What is the carbon (C) chemistry value?"]),
        Mn: parseChem(queryAnswers["What is the manganese (Mn) chemistry value?"]),
        P: parseChem(queryAnswers["What is the phosphorus (P) chemistry value?"]),
        S: parseChem(queryAnswers["What is the sulfur (S) chemistry value?"]),
        Si: parseChem(queryAnswers["What is the silicon (Si) chemistry value?"]),
        Cu: parseChem(queryAnswers["What is the copper (Cu) chemistry value?"]),
        Cr: parseChem(queryAnswers["What is the chromium (Cr) chemistry value?"]),
        Ni: parseChem(queryAnswers["What is the nickel (Ni) chemistry value?"]),
        V: parseChem(queryAnswers["What is the vanadium (V) chemistry value?"]),
        Mo: parseChem(queryAnswers["What is the molybdenum (Mo) chemistry value?"]),
        Al: parseChem(queryAnswers["What is the aluminum (Al) chemistry value?"]),
        CE: parseChem(queryAnswers["What is the carbon equivalent (CE or CEV)?"]),
      };
    }
    
    // Parse CVN
    const cvnText = queryAnswers["What are the Charpy V-notch impact test values?"] || '';
    const cvnValues = cvnText.match(/[\d.]+/g)?.map(Number) || [];
    
    // Parse mechanical
    const mechanical = {
      tensile: queryAnswers["What is the tensile strength?"] || '',
      yield: queryAnswers["What is the yield strength?"] || '',
      elongation: queryAnswers["What is the elongation percentage?"] || '',
    };
    
    // Parse specifications
    const specText = queryAnswers["What is the ASTM specification or material specification?"] || '';
    const specifications = specText.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Country of origin
    const originText = queryAnswers["What is the country of origin or where was the steel melted and manufactured?"] || '';
    let countryOfOrigin = 'Unknown';
    if (/usa|united states|domestic|america/i.test(originText)) {
      countryOfOrigin = 'USA';
    }
    
    return {
      success: true,
      heatNumbers,
      specifications,
      grade: queryAnswers["What is the grade of the steel?"] || '',
      materialType: queryAnswers["What is the material type (beam, channel, angle, plate, HSS, sheet, coil, weld stud, flat bar)?"] || '',
      size: queryAnswers["What is the size or dimension of the material?"] || '',
      chemistryByHeat,
      mechanical,
      cvn: {
        raw: cvnText,
        values: cvnValues,
      },
      killedFineGrain,
      noWeldRepair,
      countryOfOrigin,
      poNumber: queryAnswers["What is the purchase order (PO) number?"] || '',
      rawText,
      notes: '',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      heatNumbers: [],
      specifications: [],
      grade: '',
      materialType: '',
      size: '',
      chemistryByHeat: {},
      mechanical: {},
      cvn: {},
      killedFineGrain: false,
      noWeldRepair: false,
      countryOfOrigin: '',
      poNumber: '',
      rawText: '',
      notes: '',
    };
  }
}
