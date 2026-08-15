// ===== MILL TEMPLATE KNOWLEDGE BASE =====
// Each mill has a deterministic MTR template. These are created in Excel/ERP systems
// and exported to PDF. The format, field locations, and value patterns are known.
// This knowledge guides extraction instead of blind OCR parsing.

var MILL_TEMPLATES = {
  'nucor-yamato': {
    name: 'Nucor-Yamato Steel',
    aliases: ['NUCOR-YAMATO', 'NUCOR YAMATO', 'NUCOR\u2010YAMATO'],
    products: ['beam'],
    // Document layout zones (as fractions of page height)
    zones: {
      header:     { y0: 0.00, y1: 0.08 },  // Company name, logo
      customer:   { y0: 0.08, y1: 0.18 },  // PO, customer, ship date
      product:    { y0: 0.18, y1: 0.28 },  // Size, spec, grade, quantity
      chemistry:  { y0: 0.28, y1: 0.65 },  // Heat numbers + chemistry table
      cvn:        { y0: 0.65, y1: 0.80 },  // Charpy V-notch results
      cert:       { y0: 0.80, y1: 1.00 }   // Certification, origin, signature
    },
    heatFormat: /^\d{6}$/,
    heatLabel: 'HEAT',
    specs: ['A588', 'A709-50W', 'A992', 'A572-50', 'A36'],
    sizePattern: /W\d+["\s]*[xX]\s*\d+/,
    sizeFormat: 'W##x## (web depth x lbs/ft)',
    originPhrases: ['100% Melted and Manufactured in U.S.A.', 'Melted and Manufactured in USA'],
    // Chemistry elements in the order they appear on Nucor-Yamato MTRs
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb'],
    // Expected value ranges (metallurgist knowledge — flags OCR errors)
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.40, 1.65], P:  [0.001, 0.04], S:  [0.001, 0.05],
      Si: [0.10, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.75],
      V:  [0.00, 0.12], Mo: [0.00, 0.08], Nb: [0.00, 0.05]
    },
    cvnFormat: 'table',
    notes: 'Nucor-Yamato produces W-shape beams. Heat numbers are 6 digits. Chemistry reported as percentages. A588/A709-50W for weathering, A992 for non-weathering.'
  },

  'nucor-tuscaloosa': {
    name: 'Nucor Steel Tuscaloosa',
    aliases: ['NUCOR STEEL TUSCALOOSA', 'NUCOR TUSCALOOSA', 'TUSCALOOSA'],
    products: ['plate'],
    zones: {
      header:     { y0: 0.00, y1: 0.10 },
      customer:   { y0: 0.10, y1: 0.22 },
      product:    { y0: 0.22, y1: 0.35 },
      chemistry:  { y0: 0.35, y1: 0.70 },
      cvn:        { y0: 0.70, y1: 0.85 },
      cert:       { y0: 0.85, y1: 1.00 }
    },
    heatFormat: /^\d{6}(-\d{2})?$/,
    heatLabel: 'HEAT/SLAB',
    specs: ['A588', 'A709-50W', 'A709-50', 'A572-50', 'A36'],
    sizePattern: /\d+\.?\d*\s*x\s*\d+\.?\d*\s*x\s*\d+\.?\d*/,
    sizeFormat: 'thickness x width x length (inches)',
    originPhrases: ['Melted and Manufactured in U.S.A.', 'Produced in USA'],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'Sn', 'B', 'Ti', 'N'],
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.40, 1.65], P:  [0.001, 0.04], S:  [0.001, 0.05],
      Si: [0.05, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.75],
      V:  [0.00, 0.12], Mo: [0.00, 0.08], Nb: [0.00, 0.05], Sn: [0.00, 0.03],
      B:  [0.000, 0.002], Ti: [0.00, 0.01], N: [0.002, 0.012]
    },
    cvnFormat: 'table',
    notes: 'Nucor Tuscaloosa produces plate steel. Heat numbers are 6 digits, often with -01 slab suffix. Size is thickness x width x length.'
  },

  'cmc-alabama': {
    name: 'CMC Steel Alabama',
    aliases: ['CMC STEEL ALABAMA', 'CMC STEEL', 'CMC'],
    products: ['angle', 'channel', 'flatbar'],
    zones: {
      header:     { y0: 0.00, y1: 0.08 },
      customer:   { y0: 0.08, y1: 0.18 },
      product:    { y0: 0.18, y1: 0.30 },
      chemistry:  { y0: 0.30, y1: 0.70 },
      cvn:        { y0: 0.70, y1: 0.82 },
      cert:       { y0: 0.82, y1: 1.00 }
    },
    heatFormat: /^\d{7}$/,
    heatLabel: 'HEAT',
    specs: ['A709-50W', 'A588', 'A36', 'A572-50'],
    sizePattern: /L?\d+\s*[xX]\s*\d+\s*[xX]\s*\d+\/\d+|C\d+\s*[xX]\s*\d+/,
    sizeFormat: 'Angle: L##x##x## | Channel: C##x##',
    originPhrases: ['Melted and Manufactured in USA', 'Made in USA'],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'Mo', 'Cb', 'Sn', 'B', 'Ti', 'N'],
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.40, 1.65], P:  [0.001, 0.04], S:  [0.001, 0.05],
      Si: [0.05, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.75],
      Mo: [0.00, 0.08], Cb: [0.00, 0.05], Sn: [0.00, 0.03], B:  [0.000, 0.002],
      Ti: [0.00, 0.01], N:  [0.002, 0.012]
    },
    cvnFormat: 'table',
    notes: 'CMC Alabama produces angles and channels. Heat numbers are 7 digits. Uses "Cb" for Niobium (Columbium). Size format: L4x3x1/4 for angles, C8x18.75 for channels.'
  },

  'atlas-tube': {
    name: 'Atlas Tube (JMC Steel Group)',
    aliases: ['ATLAS TUBE', 'ATLAS', 'JMC STEEL GROUP', 'JMC'],
    products: ['hss-square', 'hss-round', 'hss-rectangular'],
    zones: {
      header:     { y0: 0.00, y1: 0.08 },
      customer:   { y0: 0.08, y1: 0.18 },
      product:    { y0: 0.18, y1: 0.28 },
      chemistry:  { y0: 0.28, y1: 0.68 },
      cvn:        { y0: 0.68, y1: 0.80 },
      cert:       { y0: 0.80, y1: 1.00 }
    },
    heatFormat: /^\d{8}$/,
    heatLabel: 'HEAT',
    specs: ['A500-B', 'A500-C', 'A1085', 'A513'],
    sizePattern: /\d+\.?\d*\s*[xX]\s*\d+\.?\d*\s*[xX]*\s*\d*\.?\d*/,
    sizeFormat: 'width x width x wall (or OD x wall for round)',
    originPhrases: ['Melted and Manufactured in U.S.A.', 'Country of Origin: USA'],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'Mo', 'V', 'Ti', 'B', 'N', 'Al', 'Ca'],
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.20, 1.65], P:  [0.001, 0.045], S:  [0.001, 0.045],
      Si: [0.001, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.50],
      Mo: [0.00, 0.08], V:  [0.00, 0.12], Ti: [0.00, 0.01], B:  [0.000, 0.002],
      N:  [0.001, 0.012], Al: [0.00, 0.05], Ca: [0.000, 0.005]
    },
    cvnFormat: 'none',
    notes: 'Atlas Tube produces HSS sections. Heat numbers are 8 digits. Size format: width x width x wall (e.g. 10x10x0.375).'
  },

  'arcelormittal': {
    name: 'ArcelorMittal',
    aliases: ['ARCELORMITTAL', 'ARCELOR MITTAL', 'ARCELOR'],
    products: ['beam', 'plate', 'angle', 'channel'],
    zones: {
      header:     { y0: 0.00, y1: 0.10 },
      customer:   { y0: 0.10, y1: 0.20 },
      product:    { y0: 0.20, y1: 0.30 },
      chemistry:  { y0: 0.30, y1: 0.65 },
      cvn:        { y0: 0.65, y1: 0.82 },
      cert:       { y0: 0.82, y1: 1.00 }
    },
    heatFormat: /^\d{5,8}[A-Z]?$/,
    heatLabel: 'HEAT',
    specs: ['A588', 'A709-50W', 'A992', 'A572-50', 'A36'],
    sizePattern: /W\d+["\s]*[xX]\s*\d+|\d+\.?\d*\s*x\s*\d+\.?\d*/,
    sizeFormat: 'varies by product',
    originPhrases: ['Melted and Manufactured in U.S.A.', 'Country of Origin: USA'],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'Sn', 'Al', 'B', 'N'],
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.40, 1.65], P:  [0.001, 0.04], S:  [0.001, 0.05],
      Si: [0.05, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.75],
      V:  [0.00, 0.12], Mo: [0.00, 0.08], Nb: [0.00, 0.05], Sn: [0.00, 0.03],
      Al: [0.00, 0.05], B:  [0.000, 0.002], N:  [0.002, 0.012]
    },
    cvnFormat: 'table',
    notes: 'ArcelorMittal produces all structural shapes. Multiple mill locations. Heat numbers vary by location.'
  },

  'steel-dynamics': {
    name: 'Steel Dynamics',
    aliases: ['STEEL DYNAMICS', 'SDI', 'STRUCTURAL STEEL DIVISION'],
    products: ['beam', 'channel', 'angle', 'flatbar'],
    zones: {
      header:     { y0: 0.00, y1: 0.10 },
      customer:   { y0: 0.10, y1: 0.20 },
      product:    { y0: 0.20, y1: 0.30 },
      chemistry:  { y0: 0.30, y1: 0.68 },
      cvn:        { y0: 0.68, y1: 0.82 },
      cert:       { y0: 0.82, y1: 1.00 }
    },
    heatFormat: /^\d{6}$/,
    heatLabel: 'HEAT',
    specs: ['A588', 'A709-50W', 'A992', 'A572-50', 'A36'],
    sizePattern: /W\d+["\s]*[xX]\s*\d+|C\d+\s*[xX]\s*\d+|L\d+\s*[xX]\s*\d+/,
    sizeFormat: 'varies by product',
    originPhrases: ['Melted and Manufactured in U.S.A.', 'Produced in USA'],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'Sn', 'B', 'Ti', 'N'],
    chemRanges: {
      C:  [0.01, 0.25], Mn: [0.40, 1.65], P:  [0.001, 0.04], S:  [0.001, 0.05],
      Si: [0.05, 0.50], Cu: [0.00, 0.55], Ni: [0.00, 0.55], Cr: [0.00, 0.75],
      V:  [0.00, 0.12], Mo: [0.00, 0.08], Nb: [0.00, 0.05], Sn: [0.00, 0.03],
      B:  [0.000, 0.002], Ti: [0.00, 0.01], N:  [0.002, 0.012]
    },
    cvnFormat: 'table',
    notes: 'Steel Dynamics produces W-shapes, channels, angles. Heat numbers are 6 digits.'
  },

  'general': {
    name: 'Unknown Mill',
    aliases: [],
    products: [],
    zones: {
      header:     { y0: 0.00, y1: 0.12 },
      customer:   { y0: 0.12, y1: 0.22 },
      product:    { y0: 0.22, y1: 0.35 },
      chemistry:  { y0: 0.35, y1: 0.70 },
      cvn:        { y0: 0.70, y1: 0.85 },
      cert:       { y0: 0.85, y1: 1.00 }
    },
    heatFormat: /^\d{5,8}$/,
    heatLabel: 'HEAT',
    specs: [],
    sizePattern: /.*/,
    sizeFormat: 'unknown',
    originPhrases: [],
    chemElements: ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'Sn', 'B', 'Ti', 'N', 'Al', 'Ca'],
    chemRanges: {
      C:  [0.01, 0.30], Mn: [0.20, 1.65], P:  [0.001, 0.05], S:  [0.001, 0.05],
      Si: [0.001, 0.50], Cu: [0.00, 0.60], Ni: [0.00, 0.60], Cr: [0.00, 0.80],
      V:  [0.00, 0.15], Mo: [0.00, 0.10], Nb: [0.00, 0.06], Sn: [0.00, 0.04],
      B:  [0.000, 0.003], Ti: [0.00, 0.01], N:  [0.001, 0.015], Al: [0.00, 0.06], Ca: [0.000, 0.006]
    },
    cvnFormat: 'any',
    notes: 'Fallback template for unknown mills.'
  }
};

// ===== METALLURGICAL KNOWLEDGE BASE =====
// Steel mill operator + metallurgist knowledge for validation and context

var METAL_KNOWLEDGE = {
  // Spec relationships: which specs are weathering vs non-weathering
  weatheringSpecs: ['A588', 'A709-50W', 'A588-A709-50W'],
  nonWeatheringSpecs: ['A36', 'A992', 'A572-50', 'A709-50', 'A500-B', 'A500-C'],

  // Grade meanings
  gradeInfo: {
    'A36':     { type: 'mild steel',         weathering: false, description: 'Carbon structural steel, general purpose' },
    'SA36':    { type: 'mild steel',         weathering: false, description: 'ASME version of A36' },
    'A588':    { type: 'weathering steel',    weathering: true,  description: 'High-strength low-alloy weathering steel (Cu+Cr for patina)' },
    'A709-50W':{ type: 'weathering bridge',   weathering: true,  description: 'Bridge steel, Grade 50W (weathering)' },
    'A709-50': { type: 'non-weathering bridge',weathering: false, description: 'Bridge steel, Grade 50 (non-weathering)' },
    'A992':    { type: 'structural beam',     weathering: false, description: 'Structural steel for W-shapes, non-weathering' },
    'A572-50': { type: 'HSLA steel',          weathering: false, description: 'High-strength low-alloy, Grade 50' },
    'A500-B':  { type: 'HSS',                 weathering: false, description: 'Cold-formed welded HSS, Grade B' },
    'A500-C':  { type: 'HSS',                 weathering: false, description: 'Cold-formed welded HSS, Grade C' },
    'A1085':   { type: 'HSS',                 weathering: false, description: 'Hot-rolled HSS with tighter tolerances' }
  },

  // Shape designation rules (how sizes are written)
  shapeRules: {
    'beam':      'W + web depth (in) + x + lbs/ft. Example: W24x76 = 24" web depth, 76 lbs/ft',
    'channel':   'C + web depth (in) + x + lbs/ft. Example: C8x18.75 = 8" depth, 18.75 lbs/ft',
    'angle':     'L + leg1 + x + leg2 + x + thickness. Example: L4x3x1/4',
    'plate':     'thickness x width x length (inches). Example: 0.375 x 96 x 240',
    'flatbar':   'thickness x width (inches). Example: 1/2 x 4',
    'hss-square':'width x width x wall. Example: 10x10x0.375 or HSS10x10x375',
    'hss-round': 'OD x wall. Example: 6x0.500 or HSS6x0.500',
    'pipe':      'NPS + schedule. Example: 6in Sch 40'
  },

  // Chemistry validation: expected ranges for structural steel (catches OCR errors)
  // Values outside these ranges indicate OCR misreads, not actual chemistry
  validationRanges: {
    C:  { min: 0.01,  max: 0.30,  label: 'Carbon',     typical: '0.05-0.23' },
    Mn: { min: 0.20,  max: 1.65,  label: 'Manganese',  typical: '0.60-1.35' },
    P:  { min: 0.001, max: 0.050, label: 'Phosphorus', typical: '0.005-0.035' },
    S:  { min: 0.001, max: 0.050, label: 'Sulfur',     typical: '0.005-0.030' },
    Si: { min: 0.001, max: 0.50,  label: 'Silicon',    typical: '0.15-0.40' },
    Cu: { min: 0.00,  max: 0.60,  label: 'Copper',     typical: '0.20-0.45 (weathering)' },
    Ni: { min: 0.00,  max: 0.60,  label: 'Nickel',     typical: '0.00-0.45' },
    Cr: { min: 0.00,  max: 0.80,  label: 'Chromium',   typical: '0.40-0.70 (weathering)' },
    V:  { min: 0.00,  max: 0.15,  label: 'Vanadium',   typical: '0.01-0.10' },
    Mo: { min: 0.00,  max: 0.10,  label: 'Molybdenum', typical: '0.00-0.06' },
    Nb: { min: 0.00,  max: 0.06,  label: 'Niobium',    typical: '0.001-0.04' },
    Cb: { min: 0.00,  max: 0.06,  label: 'Columbium', typical: '0.001-0.04 (same as Nb)' },
    Sn: { min: 0.00,  max: 0.04,  label: 'Tin',        typical: '0.005-0.025' },
    B:  { min: 0.000, max: 0.003, label: 'Boron',      typical: '0.0001-0.0015' },
    Ti: { min: 0.00,  max: 0.01,  label: 'Titanium',   typical: '0.001-0.005' },
    N:  { min: 0.001, max: 0.015, label: 'Nitrogen',   typical: '0.005-0.012' },
    Al: { min: 0.00,  max: 0.06,  label: 'Aluminum',   typical: '0.005-0.04' },
    Ca: { min: 0.000, max: 0.006, label: 'Calcium',    typical: '0.0002-0.003' }
  },

  // Carbon Equivalent formula (IIW / AWS)
  ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
  ceLimit: 0.45, // For shapes <= 2" per A709

  // Weathering steel minimum requirements
  weatheringMin: {
    Cu: { min: 0.20, desc: 'Copper minimum for weathering patina' },
    Cr: { min: 0.40, max: 0.70, desc: 'Chromium range for weathering' }
  },

  // AWS D1.5 Cl 5.4.2 WPS qualification rules
  wpsRules: {
    rule1: 'C >= 0.15% — qualifies all grades',
    rule2: 'C >= 0.12% AND CE >= 0.45% — qualifies all grades',
    rule3: 'C >= 0.12% but CE < 0.45% — 50W only',
    rule4: 'C < 0.12% — WPS for 50W only'
  },

  // How MTRs are created (document knowledge)
  documentInfo: {
    creationMethod: 'MTRs are generated by mill ERP/sales software (SAP, custom systems, or Excel templates) and exported to PDF. The layout is deterministic per mill — same template every time.',
    chemistrySource: 'Chemistry data comes from spectrometer analysis of each heat in the mill lab. Values are percentages by weight.',
    heatNumberMeaning: 'A heat number identifies a single batch of molten steel. All products from the same heat have identical chemistry.',
    cvnTesting: 'Charpy V-notch (CVN) testing measures impact toughness at specified temperatures. Required for bridge steel (A709) in zones 1 (70°F), 2 (40°F), or 3 (10°F).',
    domesticSteel: 'Made in America / Buy America Act compliance requires steel to be both melted AND manufactured in the USA. The MTR must state this explicitly.'
  }
};

// ===== MILL IDENTIFICATION =====
// Identifies which mill produced an MTR from the first ~200 chars of OCR/text
function identifyMill(text) {
  var upper = text.substring(0, 500).toUpperCase().replace(/\s+/g, ' ');
  var bestMatch = 'general';
  var bestScore = 0;

  for (var key in MILL_TEMPLATES) {
    if (key === 'general') continue;
    var template = MILL_TEMPLATES[key];
    for (var i = 0; i < template.aliases.length; i++) {
      var alias = template.aliases[i].toUpperCase();
      if (upper.indexOf(alias) !== -1) {
        // Earlier in the document = higher confidence
        var position = upper.indexOf(alias);
        var score = template.aliases[i].length + (position < 100 ? 10 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = key;
        }
      }
    }
  }
  return { key: bestMatch, template: MILL_TEMPLATES[bestMatch] };
}

// ===== TEMPLATE-GUIDED EXTRACTION =====
// Uses the mill template to extract fields from OCR words by their known positions
function extractWithTemplate(allWords, allText, millInfo) {
  var template = millInfo.template;
  var results = {
    mill: template.name,
    heatNums: [],
    spec: null,
    size: null,
    grade: null,
    matType: null,
    origin: null,
    poNumber: null,
    quantity: null,
    cvnDetected: false,
    chem1: {},
    chem2: {},
    confidence: {},
    warnings: []
  };

  var flat = allText.replace(/\s+/g, ' ').trim();
  var upper = flat.toUpperCase();

  // --- MILL NAME ---
  results.confidence.mill = 0.95;

  // --- HEAT NUMBERS ---
  // Use mill-specific heat format and label
  if (allWords && allWords.length > 0) {
    // Group words into rows for table-aware extraction
    var rows = groupWordsIntoRows(allWords);
    // Find heat number by looking for the heat label, then taking the next number
    for (var r = 0; r < rows.length; r++) {
      var rowText = rows[r].map(function(w) { return w.str; }).join(' ').toUpperCase();
      if (rowText.indexOf(template.heatLabel) !== -1 || /HEAT|MELT|SLAB/i.test(rowText)) {
        // Look for number in this row or next row
        for (var c = 0; c < rows[r].length; c++) {
          var word = rows[r][c].str.replace(/[^\w-]/g, '');
          var cleaned = cleanOcrNumber(word);
          if (template.heatFormat.test(cleaned) && results.heatNums.indexOf(cleaned) === -1) {
            results.heatNums.push(cleaned);
          }
        }
        // Also check next row (value might be below label)
        if (r + 1 < rows.length && results.heatNums.length === 0) {
          for (var c2 = 0; c2 < rows[r + 1].length; c2++) {
            var word2 = rows[r + 1][c2].str.replace(/[^\w-]/g, '');
            var cleaned2 = cleanOcrNumber(word2);
            if (template.heatFormat.test(cleaned2) && results.heatNums.indexOf(cleaned2) === -1) {
              results.heatNums.push(cleaned2);
            }
          }
        }
      }
    }
  }
  // Fallback: regex on flat text
  if (results.heatNums.length === 0) {
    var heatRe = /HEAT\s*(?:\/\s*SLAB)?\s*(?:NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Za-z0-9]{5,12})/gi;
    var hm;
    while ((hm = heatRe.exec(flat)) !== null) {
      var raw = hm[1].replace(/[^A-Za-z0-9]/g, '');
      var cleaned = cleanOcrNumber(raw);
      if (cleaned.length >= 5 && /^\d{5,8}$/.test(cleaned) && results.heatNums.indexOf(cleaned) === -1) {
        results.heatNums.push(cleaned);
      }
    }
  }
  results.confidence.heat = results.heatNums.length > 0 ? 0.9 : 0;

  // --- SPECIFICATION ---
  // Check against mill's known spec list first
  for (var s = 0; s < template.specs.length; s++) {
    var spec = template.specs[s];
    var specRe = new RegExp('\\b' + spec.replace(/-/g, '[-]?') + '\\b', 'i');
    if (specRe.test(flat)) {
      results.spec = spec;
      results.confidence.spec = 0.95;
      break;
    }
  }
  // Fallback: search for ASTM/AASHTO pattern
  if (!results.spec) {
    var specMatch = flat.match(/\b(?:ASTM\s*)?(?:A|SA)(\d{3})\s*[-/]?\s*(\d{2})?(?:\s*Gr\s*)?(\d{0,2})\s*([Ww]?)\b/i);
    if (specMatch) {
      var specNum = specMatch[1];
      var gradeNum = specMatch[3];
      var isW = specMatch[4] && specMatch[4].toUpperCase() === 'W';
      // OCR tolerance: 703 → 709, 588 → 588
      if (specNum === '703') specNum = '709';
      if (gradeNum === '50' && isW && (specNum === '709' || specNum === '588')) {
        results.spec = 'A709-50W';
      } else if (specNum === '588') {
        results.spec = 'A588';
      } else if (specNum === '992') {
        results.spec = 'A992';
      } else if (specNum === '36') {
        results.spec = 'A36';
      } else if (specNum === '572') {
        results.spec = 'A572-50';
      } else if (specNum === '500') {
        results.spec = gradeNum === 'C' ? 'A500-C' : 'A500-B';
      }
      results.confidence.spec = 0.7;
    }
  }

  // --- MATERIAL TYPE ---
  // Use mill's product list and text patterns
  if (template.products.length > 0) {
    results.matType = template.products[0];
  }
  // Override based on size pattern
  if (/\bW\d+\s*[xX]\s*\d+/i.test(flat)) results.matType = 'beam';
  else if (/\bC\d+\s*[xX]\s*\d+/i.test(flat)) results.matType = 'channel';
  else if (/\bL\d+\s*[xX]\s*\d+/i.test(flat)) results.matType = 'angle';
  else if (/HSS|HOLLOW\s+STRUCT/i.test(flat)) results.matType = /SQUARE/i.test(flat) ? 'hss-square' : 'hss-round';

  // --- SIZE ---
  // Use mill's size pattern
  if (template.sizePattern) {
    var sizeMatch = flat.match(template.sizePattern);
    if (sizeMatch) {
      results.size = sizeMatch[0].trim();
      results.confidence.size = 0.85;
    }
  }
  // Fallback size patterns
  if (!results.size) {
    var sizePatterns = [
      /W\d+\s*["\s]*[xX]\s*["\s]*\d+\.?\d*/i,          // W24x76
      /C\d+\s*[xX]\s*\d+\.?\d*/i,                       // C8x18.75
      /L\d+\s*[xX]\s*\d+\s*[xX]\s*\d+\/\d+/i,           // L4x3x1/4
      /\d+\.?\d*\s*x\s*\d+\.?\d*\s*x\s*\d+\.?\d*/i,     // 0.375 x 96 x 240
      /HSS\s*\d+\.?\d*\s*[xX]\s*\d+\.?\d*/i,            // HSS10x10
      /\d+\.?\d*\s*[xX]\s*\d+\.?\d*\s*[xX]?\s*\d*\.?\d*/i // generic
    ];
    for (var sp = 0; sp < sizePatterns.length; sp++) {
      var sm = flat.match(sizePatterns[sp]);
      if (sm) {
        results.size = sm[0].trim();
        results.confidence.size = 0.7;
        break;
      }
    }
  }

  // --- COUNTRY OF ORIGIN ---
  for (var op = 0; op < template.originPhrases.length; op++) {
    var phrase = template.originPhrases[op];
    if (upper.indexOf(phrase.toUpperCase()) !== -1) {
      results.origin = 'USA';
      results.confidence.origin = 0.95;
      break;
    }
  }
  // Generic origin detection
  if (!results.origin) {
    if (/MELTED\s+AND\s+MANUFACTURED\s+IN\s+(?:U\.?S\.?A\.?|USA)/i.test(flat) ||
        /MADE\s+IN\s+(?:U\.?S\.?A\.?|USA|AMERICA)/i.test(flat) ||
        /PRODUCED\s+IN\s+(?:U\.?S\.?A\.?|USA)/i.test(flat) ||
        /BUY\s+AMERICA/i.test(flat) ||
        /BUILD\s+AMERICA/i.test(flat)) {
      results.origin = 'USA';
      results.confidence.origin = 0.9;
    }
  }

  // --- CVN DETECTION ---
  if (/CHARPY|CVN|IMPACT|V[-\s]?NOTCH/i.test(flat)) {
    results.cvnDetected = true;
    results.confidence.cvn = 0.85;
  }

  // --- PO NUMBER ---
  var poMatch = flat.match(/\b(?:P\.?O\.?|PURCHASE\s+ORDER)\s*(?:NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Za-z0-9\-]{3,20})/i);
  if (poMatch) results.poNumber = poMatch[1].trim();

  // --- CHEMISTRY EXTRACTION ---
  // Use mill's known element list and table-aware extraction
  if (allWords && allWords.length > 0) {
    var chem = extractChemFromWords(allWords, template);
    if (Object.keys(chem).length >= 3) {
      results.chem1 = chem;
      results.confidence.chem = 0.9;
    }
  }
  // Fallback: flat text chemistry
  if (Object.keys(results.chem1).length < 3) {
    var flatChem = extractChemFromText(flat, template);
    if (Object.keys(flatChem).length > 0) {
      // Merge: fill gaps
      for (var ek in flatChem) {
        if (!results.chem1[ek]) results.chem1[ek] = flatChem[ek];
      }
      if (Object.keys(results.chem1).length >= 3) {
        results.confidence.chem = 0.75;
      }
    }
  }

  // --- CHEMISTRY VALIDATION (metallurgist check) ---
  for (var elem in results.chem1) {
    var val = parseFloat(results.chem1[elem]);
    var ranges = template.chemRanges[elem] || METAL_KNOWLEDGE.validationRanges[elem];
    if (ranges && !isNaN(val)) {
      if (val < ranges[0] || val > ranges[1]) {
        results.warnings.push(elem + '=' + results.chem1[elem] + ' is outside expected range (' + ranges[0] + '-' + ranges[1] + ') — possible OCR error');
      }
    }
  }

  return results;
}

// ===== HELPER FUNCTIONS =====

function cleanOcrNumber(str) {
  // Common OCR substitutions for numbers
  return str.replace(/o/gi, '0').replace(/O/g, '0').replace(/l/g, '1').replace(/I/g, '1')
            .replace(/S/g, '5').replace(/B/g, '8').replace(/[^0-9A-Z\-]/gi, '');
}

function groupWordsIntoRows(words) {
  if (!words || words.length === 0) return [];
  var clean = words.filter(function(w) { return w.str && w.str.trim().length > 0; });
  if (clean.length === 0) return [];
  clean.sort(function(a, b) { return a.y0 - b.y0 || a.x0 - b.x0; });
  var heights = clean.map(function(w) { return w.y1 - w.y0; }).sort(function(a, b) { return a - b; });
  var medianH = heights[Math.floor(heights.length / 2)] || 20;
  var rowThreshold = medianH * 0.6;
  var rows = [];
  var curRow = [];
  var lastY = -9999;
  for (var i = 0; i < clean.length; i++) {
    var w = clean[i];
    if (Math.abs(w.y0 - lastY) > rowThreshold && curRow.length > 0) {
      rows.push(curRow);
      curRow = [];
    }
    curRow.push(w);
    lastY = w.y0;
  }
  if (curRow.length > 0) rows.push(curRow);
  rows.forEach(function(r) { r.sort(function(a, b) { return a.x0 - b.x0; }); });
  return rows;
}

// Chemistry extraction using word coordinates + mill template
function extractChemFromWords(words, template) {
  var ELEMENTS = template.chemElements;
  var ranges = template.chemRanges;
  var rows = groupWordsIntoRows(words);
  if (rows.length < 2) return {};

  // Find chemistry header row: row with 4+ element symbols
  var headerRow = -1;
  var headerCols = {};
  var allElements = ['C','Mn','P','S','Si','Cu','Ni','Cr','V','Mo','Nb','Cb','Sn','B','Ti','N','Al','Ca','Co','W','Pb','Mg','Ce'];
  for (var r = 0; r < rows.length; r++) {
    var elemCount = 0;
    var cols = {};
    for (var c = 0; c < rows[r].length; c++) {
      var txt = rows[r][c].str.trim().replace(/[:.\-\/]/g, '');
      var elemKey = null;
      // Exact match
      if (allElements.indexOf(txt) !== -1) elemKey = txt;
      else if (allElements.indexOf(txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) !== -1) {
        elemKey = txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
      }
      if (elemKey) {
        // Normalize Cb/Nb
        if (elemKey === 'Cb') elemKey = 'Cb';
        if (elemKey === 'Nb') elemKey = 'Cb';
        cols[elemKey] = { x0: rows[r][c].x0, x1: rows[r][c].x1 };
        elemCount++;
      }
    }
    if (elemCount >= 4) {
      headerRow = r;
      headerCols = cols;
      break;
    }
  }
  if (headerRow === -1) return {};

  // Find data rows and map values to columns
  var chem = {};
  var heights = words.map(function(w) { return w.y1 - w.y0; }).sort(function(a, b) { return a - b; });
  var medianH = heights[Math.floor(heights.length / 2)] || 20;

  for (var r = headerRow + 1; r < Math.min(headerRow + 6, rows.length); r++) {
    var dataCount = 0;
    for (var c = 0; c < rows[r].length; c++) {
      var word = rows[r][c].str.trim().replace(/%$/, '');
      // Skip heat numbers (6+ digits, no decimal)
      if (/^\d{6,}$/.test(word)) continue;
      // Try to parse as number (with OCR substitutions)
      var numCheck = word.replace(/o/gi, '0').replace(/I/g, '1').replace(/l/g, '1').replace(/s/g, '5');
      if (/^\d+\.?\d*$/.test(numCheck) || /^\d*\.\d+$/.test(numCheck)) {
        // Find which element column this aligns with
        var valXc = (rows[r][c].x0 + rows[r][c].x1) / 2;
        var bestElem = null;
        var bestDist = 99999;
        for (var elem in headerCols) {
          var hdrXc = (headerCols[elem].x0 + headerCols[elem].x1) / 2;
          var dist = Math.abs(valXc - hdrXc);
          if (dist < bestDist && dist < medianH * 2.5) {
            bestDist = dist;
            bestElem = elem;
          }
        }
        if (bestElem && !chem[bestElem]) {
          var rawVal = word;
          // Validate against expected range
          var range = ranges[bestElem] || METAL_KNOWLEDGE.validationRanges[bestElem];
          var numVal = parseFloat(rawVal);
          if (range && !isNaN(numVal)) {
            // Skip if outside expected range (likely OCR error or wrong value)
            if (numVal < range[0] || numVal > range[1]) continue;
          }
          chem[bestElem] = rawVal;
          dataCount++;
        }
      }
    }
    if (dataCount === 0 && r > headerRow + 1) break;
  }
  return chem;
}

// Chemistry extraction from flat text (fallback)
function extractChemFromText(flat, template) {
  var chem = {};
  var ranges = template.chemRanges;
  // Pattern: "C 0.06 Mn 1.25 P 0.017 S 0.015 Si 0.27 Cu 0.28 Ni 0.31 Cr 0.46"
  var elemRe = /([CMPSCVNA]\w{0,2})\s+(\d+\.?\d*)/g;
  var em;
  var allElements = ['C','Mn','P','S','Si','Cu','Ni','Cr','V','Mo','Nb','Cb','Sn','B','Ti','N','Al','Ca'];
  while ((em = elemRe.exec(flat)) !== null) {
    var elem = em[1].trim();
    var val = em[2];
    // Normalize element name
    if (elem === 'Cb' || elem === 'Nb') elem = 'Cb';
    else if (allElements.indexOf(elem) === -1) continue;
    var numVal = parseFloat(val);
    var range = ranges[elem] || METAL_KNOWLEDGE.validationRanges[elem];
    if (range && !isNaN(numVal)) {
      if (numVal < range[0] || numVal > range[1]) continue;
    }
    if (!chem[elem]) chem[elem] = val;
  }
  return chem;
}
