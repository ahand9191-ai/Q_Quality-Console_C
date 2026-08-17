import { NextRequest, NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── ASTM Spec-Specific Chemistry Limits (heat analysis) ───

const SPEC_LIMITS: Record<string, {
  name: string;
  elements: Record<string, { max?: number; min?: number; label: string; desc: string }>;
}> = {
  'A588': {
    name: 'ASTM A588 — Weathering Steel (Grades A, B, C, K)',
    elements: {
      C:  { max: 0.19, label: '≤ 0.19% (Gr.A/B), ≤ 0.15% (Gr.C), ≤ 0.17% (Gr.K)', desc: 'Carbon controls strength and weldability. Grade C is lowest for better weldability.' },
      Mn: { min: 0.80, max: 1.25, label: '0.80–1.25% (Gr.A/B/C), 0.50–1.20% (Gr.K)', desc: 'Manganese improves strength and hardenability. Grade K has a wider range.' },
      P:  { max: 0.04, label: '≤ 0.04% (all grades)', desc: 'Phosphorus reduces ductility. A588 allows up to 0.04% (note: A709 is tighter at ≤ 0.030%).' },
      S:  { max: 0.05, label: '≤ 0.05% (all grades)', desc: 'Sulfur causes hot shortness. A588 allows ≤ 0.05% (A709 is tighter at ≤ 0.030%).' },
      Si: { min: 0.15, max: 0.65, label: '0.15–0.50% (Gr.B/C), 0.30–0.65% (Gr.A), 0.25–0.65% (Gr.K)', desc: 'Silicon is a deoxidizer. Required for killed steel practice.' },
      Cu: { min: 0.20, max: 0.50, label: '0.20–0.50% (varies by grade)', desc: 'Copper provides atmospheric corrosion resistance (weathering). Essential for A588.' },
      Cr: { min: 0.40, max: 0.70, label: '0.40–0.70% (Gr.B/K), 0.40–0.65% (Gr.A)', desc: 'Chromium enhances corrosion resistance in weathering steel.' },
      Ni: { max: 0.50, label: '≤ 0.40% (Gr.A), ≤ 0.50% (Gr.B), 0.25–0.50% (Gr.C)', desc: 'Nickel improves toughness, especially at low temperatures.' },
      V:  { min: 0.01, max: 0.10, label: '0.01–0.10% (varies by grade)', desc: 'Vanadium is a grain refiner that improves strength.' },
    },
  },
  'A709': {
    name: 'ASTM A709 — Structural Steel for Bridges (Grade 50W)',
    elements: {
      C:  { max: 0.19, label: '≤ 0.19% (spec), ≤ 0.12% (AWS D1.5 Cl 5.4.2)', desc: 'ASTM allows ≤ 0.19%, but AWS D1.5 Clause 5.4.2 mandates ≤ 0.12% for bridge welds.' },
      Mn: { min: 0.80, max: 1.25, label: '0.80–1.25% (Table 4, flange ≤ 3/4")', desc: 'Per A709 Table 4. Thicker sections may allow higher Mn per the table.' },
      P:  { max: 0.030, label: '≤ 0.030% (A709 spec)', desc: 'Tighter than A588 (≤ 0.04%). Bridge steel requires low phosphorus for toughness.' },
      S:  { max: 0.030, label: '≤ 0.030% (A709 spec)', desc: 'Tighter than A588 (≤ 0.05%). Bridge steel requires low sulfur for weldability.' },
      Si: { min: 0.15, max: 0.50, label: '0.15–0.50%', desc: 'Required for killed steel practice.' },
      Cu: { min: 0.20, label: '≥ 0.20% (weathering requirement)', desc: 'Essential for atmospheric corrosion resistance in Grade 50W.' },
      Cr: { min: 0.40, max: 0.70, label: '0.40–0.70%', desc: 'Enhances corrosion resistance in weathering steel.' },
      Ni: { max: 0.50, label: '≤ 0.50%', desc: 'Improves toughness.' },
      V:  { min: 0.01, max: 0.10, label: '0.01–0.10%', desc: 'Grain refiner for strength.' },
      CE: { max: 0.47, label: '≤ 0.47% (AWS D1.5 Cl 5.4.2)', desc: 'Carbon Equivalent. CE > 0.47% requires special WPS qualification.' },
    },
  },
  'A36': {
    name: 'ASTM A36 — Carbon Structural Steel',
    elements: {
      C:  { max: 0.26, label: '≤ 0.26% (plates ≤ 3/4"), ≤ 0.29% (< 3/8")', desc: 'Carbon varies by thickness. Higher C in thinner sections.' },
      Mn: { min: 0.80, max: 1.20, label: '0.80–1.20% (plates)', desc: 'Manganese for strength. Shapes may allow 0.60–1.20%.' },
      P:  { max: 0.040, label: '≤ 0.040% (heat analysis)', desc: 'Phosphorus reduces ductility. Standard structural limit.' },
      S:  { max: 0.050, label: '≤ 0.050% (heat analysis)', desc: 'Sulfur causes hot shortness. Standard structural limit.' },
      Si: { min: 0.15, max: 0.40, label: '0.15–0.40% (plates > 3/8")', desc: 'Required for killed steel in thicker plates.' },
      Cu: { min: 0.20, label: '≥ 0.20% (when Cu steel specified)', desc: 'Optional. Added when copper-bearing steel is ordered.' },
    },
  },
  'A992': {
    name: 'ASTM A992 — Structural Steel for Buildings (W-Shapes)',
    elements: {
      C:  { max: 0.23, label: '≤ 0.23%', desc: 'A992 is the standard for W-shape beams in buildings. Lower C than A36.' },
      Mn: { min: 0.50, max: 1.60, label: '0.50–1.60%', desc: 'Wide Mn range for different shape sizes.' },
      P:  { max: 0.035, label: '≤ 0.035%', desc: 'Tighter than A36 (≤ 0.040%). Building steel quality.' },
      S:  { max: 0.045, label: '≤ 0.045%', desc: 'Tighter than A36 (≤ 0.050%).' },
      Si: { max: 0.40, label: '≤ 0.40%', desc: 'Silicon for deoxidation.' },
      V:  { max: 0.15, label: '≤ 0.15% (when specified)', desc: 'Vanadium for grain refinement.' },
      Nb: { max: 0.05, label: '≤ 0.05% (when specified)', desc: 'Niobium (columbium) for microalloying.' },
      CE: { max: 0.45, label: '≤ 0.45% (Group 1-3), ≤ 0.47% (Group 4-5)', desc: 'Carbon Equivalent. Determines preheat per AWS D1.1 Table 3.2.' },
    },
  },
  'A500': {
    name: 'ASTM A500 — Cold-Formed Welded/Seamless Carbon Steel Tubing',
    elements: {
      C:  { max: 0.26, label: '≤ 0.26% (Gr.B), ≤ 0.30% (Gr.A)', desc: 'Carbon for tubing. Grade B is most common for structural HSS.' },
      Mn: { max: 1.35, label: '≤ 1.35%', desc: 'Manganese for strength in cold-formed tubing.' },
      P:  { max: 0.035, label: '≤ 0.035%', desc: 'Tight phosphorus for cold-formed applications.' },
      S:  { max: 0.035, label: '≤ 0.035%', desc: 'Tight sulfur for cold-formed applications.' },
      Cu: { min: 0.20, label: '≥ 0.20% (when Cu specified)', desc: 'Optional copper for corrosion resistance.' },
    },
  },
  'SA-106': {
    name: 'ASME SA-106 — Seamless Carbon Steel Pipe',
    elements: {
      C:  { max: 0.30, label: '≤ 0.30% (Gr.B), ≤ 0.25% (Gr.A), ≤ 0.35% (Gr.C)', desc: 'Grade B is most common. Grade C has highest C for strength.' },
      Mn: { min: 0.29, max: 1.06, label: '0.29–1.06% (Gr.B/C), 0.27–0.93% (Gr.A)', desc: 'Manganese range varies by grade.' },
      P:  { max: 0.035, label: '≤ 0.035% (all grades, heat analysis)', desc: 'Tight phosphorus for pressure applications. Much tighter than structural steel.' },
      S:  { max: 0.035, label: '≤ 0.035% (all grades, heat analysis)', desc: 'Tight sulfur for pressure applications.' },
      Si: { min: 0.10, label: '≥ 0.10% (min)', desc: 'Minimum silicon for killed steel practice.' },
    },
  },
  'SA-516': {
    name: 'ASME SA-516 — Pressure Vessel Plate (Grades 55, 60, 65, 70)',
    elements: {
      C:  { max: 0.27, label: '≤ 0.27% (Gr.70 ≤ 1/2"), ≤ 0.31% (Gr.70 > 4")', desc: 'Carbon max varies by grade AND thickness. Gr.70: 0.21–0.31%.' },
      Mn: { min: 0.85, max: 1.20, label: '0.85–1.20% (Gr.70), 0.60–1.10% (Gr.55)', desc: 'Manganese range varies by grade.' },
      P:  { max: 0.035, label: '≤ 0.035% (heat analysis)', desc: 'Tight phosphorus for pressure vessel quality.' },
      S:  { max: 0.035, label: '≤ 0.035% (heat analysis)', desc: 'Tight sulfur for pressure vessel quality.' },
      Si: { min: 0.15, max: 0.40, label: '0.15–0.40%', desc: 'Silicon for killed steel practice.' },
    },
  },
  'API 5L': {
    name: 'API 5L — Pipeline Steel (PSL1 & PSL2)',
    elements: {
      C:  { max: 0.26, label: '≤ 0.26% (PSL1), ≤ 0.24% (PSL2)', desc: 'PSL2 has tighter C for improved field weldability.' },
      Mn: { max: 1.35, label: '≤ 1.35% (PSL1), ≤ 1.40% (PSL2)', desc: 'Pipeline steel uses higher Mn for strength.' },
      P:  { max: 0.030, label: '≤ 0.030% (PSL1), ≤ 0.025% (PSL2)', desc: 'PSL2 has tighter P. Sour service requires ≤ 0.025%.' },
      S:  { max: 0.030, label: '≤ 0.030% (PSL1), ≤ 0.015% (PSL2)', desc: 'PSL2 has MUCH tighter S. Sour service (NACE): ≤ 0.002%.' },
      V:  { max: 0.04, label: '≤ 0.04%', desc: 'Vanadium microalloying. V+Nb+Ti total ≤ 0.15%.' },
      Nb: { max: 0.04, label: '≤ 0.04%', desc: 'Niobium (columbium) for microalloyed pipeline steel.' },
      Ti: { max: 0.04, label: '≤ 0.04%', desc: 'Titanium for nitrogen control.' },
      CE: { max: 0.43, label: '≤ 0.43% (PSL2)', desc: 'PSL2 requires CE ≤ 0.43% OR PCM ≤ 0.25%.' },
    },
  },
};

// ─── Code-Level Limits (welding code requirements) ───

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
      C:  { max: 0.23, label: '≤ 0.23% (A992)', desc: 'A992 limit. A36 allows ≤ 0.26%, A588 allows ≤ 0.19%. Controls weldability.' },
      Mn: { min: 0.50, max: 1.60, label: '0.50–1.60% (A992)', desc: 'A992 range. A36: 0.80–1.20%, A588: 0.80–1.25%. Affects hardenability.' },
      P:  { max: 0.035, label: '≤ 0.035% (A992)', desc: 'A992 limit. A36 allows ≤ 0.040%. Reduces ductility and toughness.' },
      S:  { max: 0.045, label: '≤ 0.045% (A992)', desc: 'A992 limit. A36 allows ≤ 0.050%. Causes hot shortness and lamellar tearing.' },
      Si: { max: 0.40, label: '≤ 0.40%', desc: 'Deoxidizer. Required for killed steel practice.' },
      Cu: { min: 0.20, label: '≥ 0.20% (weathering steel)', desc: 'Required for A588 weathering steel corrosion resistance.' },
      CE: { max: 0.45, label: '≤ 0.45% (Grp 1-3), ≤ 0.47% (Grp 4-5)', desc: 'Determines preheat requirements per AWS D1.1 Table 3.2. CE > 0.47 requires qualified WPS.' },
    },
    ceMax: 0.45,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'CE ≤ 0.45% for Group 1-3 shapes, ≤ 0.47% for Group 4-5. Per AWS D1.1 Annex XI. CE > 0.47 may not be prequalified.',
    notes: 'AWS D1.1 covers structural steel for buildings (not bridges). Limits shown are for A992 (most common beam spec). A36: C ≤ 0.25%, P ≤ 0.04%, S ≤ 0.05%. A588: C ≤ 0.19%, P ≤ 0.04%, S ≤ 0.05%. Always verify against the actual material spec on the MTR.',
  },
  'AWS D1.5': {
    name: 'AWS D1.5 — Bridge Welding Code',
    elements: {
      C:  { max: 0.12, label: '≤ 0.12% (AWS D1.5 Cl 5.4.2)', desc: 'MANDATORY per AWS D1.5 Clause 5.4.2. ASTM A709 allows ≤ 0.19%, but the welding code overrides for bridge welds. Controls HAZ hardness.' },
      Mn: { min: 0.80, max: 1.25, label: '0.80–1.25% (A709 Table 4, flange ≤ 3/4")', desc: 'Per A709 Table 4. Thicker flanges (>3/4") may allow up to 1.50% Mn per the table. Check thickness.' },
      P:  { max: 0.030, label: '≤ 0.030% (A709 spec)', desc: 'Tighter than A588 (≤ 0.04%). Bridge steel requires low P for toughness at low temperatures.' },
      S:  { max: 0.030, label: '≤ 0.030% (A709 spec)', desc: 'Tighter than A588 (≤ 0.05%). Bridge steel requires low S for weldability and ductility.' },
      Si: { min: 0.15, max: 0.50, label: '0.15–0.50% (A588/A709)', desc: 'Required for killed steel practice. Indicates deoxidized, fine-grain practice.' },
      Cu: { min: 0.20, label: '≥ 0.20% (A709 Grade 50W)', desc: 'Essential for weathering steel atmospheric corrosion resistance. Grade 50W requires Cu.' },
      Cr: { min: 0.40, max: 0.70, label: '0.40–0.70% (A588 Grade B)', desc: 'Enhances corrosion resistance in weathering steel.' },
      Ni: { max: 0.50, label: '≤ 0.50% (A588 Grade B)', desc: 'Improves toughness, especially at low temperatures.' },
      V:  { min: 0.01, max: 0.10, label: '0.01–0.10% (A588 Grade B)', desc: 'Grain refiner. Improves strength but must be controlled for weldability.' },
      CE: { max: 0.47, label: '≤ 0.47% (AWS D1.5 Cl 5.4.2)', desc: 'MANDATORY per Clause 5.4.2. CE > 0.47% requires special WPS qualification. Maximum 0.55% for any bridge steel.' },
    },
    ceMax: 0.47,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'CE > 0.47% requires special WPS qualification per Clause 5. Maximum 0.55% for any bridge steel. This is a hard limit per AWS D1.5.',
    notes: 'AWS D1.5 governs ALL bridge welding in the US. A709 Grade 50W is the primary weathering bridge steel. P ≤ 0.030% and S ≤ 0.030% per ASTM A709 (tighter than A588\'s ≤ 0.04%). Killed fine grain practice and no weld repair statements are MANDATORY.',
  },
  'ASME': {
    name: 'ASME BPVC — Boiler & Pressure Vessel Code',
    elements: {
      C:  { max: 0.30, label: '≤ 0.30% (SA-106 Gr.B), ≤ 0.27% (SA-516 Gr.70)', desc: 'Varies by spec and thickness. SA-106 Gr.A ≤ 0.25%, Gr.B ≤ 0.30%, Gr.C ≤ 0.35%. SA-516 Gr.70: 0.21–0.31%.' },
      Mn: { min: 0.29, max: 1.06, label: '0.29–1.06% (SA-106 Gr.B), 0.85–1.20% (SA-516 Gr.70)', desc: 'Range varies by spec. Pressure vessel steel has controlled Mn for strength.' },
      P:  { max: 0.035, label: '≤ 0.035% (heat analysis, all pressure specs)', desc: 'MUCH tighter than structural steel (≤ 0.04%). Pressure applications require very low phosphorus.' },
      S:  { max: 0.035, label: '≤ 0.035% (heat analysis, all pressure specs)', desc: 'MUCH tighter than structural steel (≤ 0.05%). Pressure applications require very low sulfur.' },
      Si: { min: 0.10, label: '≥ 0.10% (min, killed steel)', desc: 'Minimum silicon for killed steel practice. SA-516: 0.15–0.40%.' },
      Cr: { max: 0.30, label: '≤ 0.30% (carbon steel), 1.00–1.50% (SA-335 P11)', desc: 'Chrome-moly alloys have much higher Cr for creep resistance at high temperature.' },
      Mo: { max: 0.10, label: '≤ 0.10% (carbon steel), 0.44–0.65% (SA-335 P11)', desc: 'Molybdenum improves high-temperature strength in alloy specs.' },
      CE: { max: 0.43, label: '≤ 0.43% (general)', desc: 'General CE limit. Individual specs may have tighter requirements. SA-516 typically ≤ 0.45%.' },
    },
    ceMax: 0.43,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'CE limits vary by material spec. SA-516 Gr.70 typically ≤ 0.45%. Low-alloy specs (P11, P22) have specific CE requirements per Section IX.',
    notes: 'ASME BPVC Section IX governs welding qualifications. Material specs in Section II (SA- prefix). SA-106 Gr.B: C ≤ 0.30%, Mn 0.29-1.06%. SA-516 Gr.70: C ≤ 0.27% (≤ 1/2"), Mn 0.85-1.20%. P and S ≤ 0.035% for ALL pressure applications. Verify against the actual material grade on the MTR.',
  },
  'API': {
    name: 'API 5L — Pipeline Steel (American Petroleum Institute)',
    elements: {
      C:  { max: 0.26, label: '≤ 0.26% (PSL1), ≤ 0.24% (PSL2)', desc: 'PSL2 has tighter C for field weldability. Lower grades (B) allow ≤ 0.28%, higher grades ≤ 0.26%.' },
      Mn: { max: 1.35, label: '≤ 1.35% (PSL1), ≤ 1.40% (PSL2)', desc: 'Pipeline steel uses higher Mn for strength. Grade B: ≤ 1.20%, X70: ≤ 1.65%.' },
      P:  { max: 0.030, label: '≤ 0.030% (PSL1), ≤ 0.025% (PSL2)', desc: 'PSL2 has tighter P. Sour service requires ≤ 0.025%.' },
      S:  { max: 0.030, label: '≤ 0.030% (PSL1), ≤ 0.015% (PSL2)', desc: 'PSL2 has MUCH tighter S. Sour service (NACE MR0175): S ≤ 0.002% — extremely tight.' },
      V:  { max: 0.04, label: '≤ 0.04%', desc: 'Vanadium for grain refinement. V+Nb+Ti combined ≤ 0.15%.' },
      Nb: { max: 0.04, label: '≤ 0.04%', desc: 'Niobium (columbium) for microalloyed pipeline steel.' },
      Ti: { max: 0.04, label: '≤ 0.04%', desc: 'Titanium for nitrogen control. Prevents strain aging.' },
      CE: { max: 0.43, label: '≤ 0.43% (PSL2)', desc: 'PSL2 requires CE ≤ 0.43% OR PCM ≤ 0.25%. PCM formula includes boron.' },
    },
    ceMax: 0.43,
    ceFormula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    ceDesc: 'PSL2 requires CE ≤ 0.43% OR PCM ≤ 0.25%. PCM = C + Si/30 + Mn/20 + Cu/20 + Ni/60 + Cr/20 + Mo/15 + V/10 + 5B. PSL1 has no CE requirement.',
    notes: 'API 5L covers pipeline steel. PSL1 is standard, PSL2 has stricter chemistry and CVN requirements. Sour service (NACE MR0175/H2S) requires S ≤ 0.002% and P ≤ 0.025% — verify if sour service is specified.',
  },
};

// ─── Match extracted spec to SPEC_LIMITS ───

function findSpecLimits(specs: string[]): { name: string; elements: Record<string, any> } | null {
  if (!specs || specs.length === 0) return null;
  const specStr = specs.join(' ').toUpperCase().replace(/[-\s]/g, '');

  for (const [key, limits] of Object.entries(SPEC_LIMITS)) {
    const keyNorm = key.toUpperCase().replace(/[-\s]/g, '');
    if (specStr.includes(keyNorm)) return limits;
  }

  // Try partial matches
  if (specStr.includes('588')) return SPEC_LIMITS['A588'];
  if (specStr.includes('709')) return SPEC_LIMITS['A709'];
  if (specStr.includes('A36') || specStr.includes('SA36')) return SPEC_LIMITS['A36'];
  if (specStr.includes('992')) return SPEC_LIMITS['A992'];
  if (specStr.includes('500')) return SPEC_LIMITS['A500'];
  if (specStr.includes('106')) return SPEC_LIMITS['SA-106'];
  if (specStr.includes('516')) return SPEC_LIMITS['SA-516'];
  if (specStr.includes('5L') || specStr.includes('API')) return SPEC_LIMITS['API 5L'];

  return null;
}

// ─── Code-specific GPT-4o prompt additions ───

function getCodePromptSection(code: string): string {
  switch (code) {
    case 'AWS D1.1':
      return `GOVERNING CODE: AWS D1.1 — Structural Welding Code (Steel)
- Focus on structural steel specs: A36, A588, A992, A500, A53, A513.
- CE limit ≤ 0.45% (Group 1-3) or ≤ 0.47% (Group 4-5) for prequalified WPS (Table 3.2).
- Look for "Buy America" compliance statements.
- Killed fine grain practice per ASTM A6/A20.
- No weld repair statement.
- A992: C ≤ 0.23%, P ≤ 0.035%, S ≤ 0.045%.
- A36: C ≤ 0.26%, P ≤ 0.040%, S ≤ 0.050%.
- A588: C ≤ 0.19%, P ≤ 0.040%, S ≤ 0.050%.`;

    case 'AWS D1.5':
      return `GOVERNING CODE: AWS D1.5 — Bridge Welding Code
- Focus on bridge steel: A709 Grade 50W, A588 weathering steel.
- C ≤ 0.12% (MANDATORY per AWS D1.5 Clause 5.4.2, overrides ASTM A709's ≤ 0.19%).
- Mn ≤ 1.25% (A709 Table 4, flange ≤ 3/4").
- P ≤ 0.030% (A709 spec, tighter than A588's ≤ 0.04%).
- S ≤ 0.030% (A709 spec, tighter than A588's ≤ 0.05%).
- CE ≤ 0.47% (MANDATORY per Clause 5.4.2).
- "Buy America" / "Build America" compliance is mandatory for federally funded bridges.
- Killed fine grain practice is REQUIRED per ASTM A6.
- No weld repair statement is REQUIRED.`;

    case 'ASME':
      return `GOVERNING CODE: ASME BPVC — Boiler & Pressure Vessel Code
- Focus on pressure equipment specs: SA-106, SA-516, SA-335, SA-240, SA-182, SA-234.
- Specs use SA- prefix (ASME equivalent of ASTM A- prefix).
- P ≤ 0.035% (heat analysis, ALL pressure specs — much tighter than structural steel).
- S ≤ 0.035% (heat analysis, ALL pressure specs — much tighter than structural steel).
- Material may have P-Number grouping (P-No.1 for carbon steel, P-No.4 for low alloy).
- Do NOT look for "Buy America" — not relevant for pressure vessels.
- Look for "fully killed" or "fine grain practice" per SA-20.
- SA-106 Gr.B: C ≤ 0.30%, Mn 0.29-1.06%.
- SA-516 Gr.70: C ≤ 0.27% (≤ 1/2"), Mn 0.85-1.20%.
- ASME welding governed by Section IX — QW-470 chemistry requirements may apply.`;

    case 'API':
      return `GOVERNING CODE: API 5L — Pipeline Steel
- Focus on pipeline specs: API 5L (grades B, X42 through X80), PSL1 and PSL2.
- PSL1: C ≤ 0.26%, Mn ≤ 1.35%, P ≤ 0.030%, S ≤ 0.030%.
- PSL2: C ≤ 0.24%, Mn ≤ 1.40%, P ≤ 0.025%, S ≤ 0.015%.
- CE ≤ 0.43% OR PCM ≤ 0.25% (PSL2 only).
- CVN impact testing is mandatory for PSL2.
- Look for PSL designation (PSL1 or PSL2).
- Sour service (NACE MR0175): S ≤ 0.002%, P ≤ 0.025%.
- Do NOT look for "Buy America" — not relevant for pipeline steel.
- V+Nb+Ti combined ≤ 0.15%.`;

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

    // Find spec-specific limits
    const specLimits = extractedData.specifications ? findSpecLimits(extractedData.specifications) : null;

    return NextResponse.json({
      success: true,
      extractionMethod,
      textLength: fullText.length,
      code,
      codeLimits: CODE_LIMITS[code] || CODE_LIMITS['AWS D1.5'],
      specLimits,
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
5. Grade — e.g. Grade 50W, Grade B, Grade 36, X52, B. Separate from spec if combined.
6. Chemistry (per heat) — C, Mn, P, S, Si, Cu, Ni, Cr, V, Mo, Nb, Ti, CE if present.
7. Mechanical Properties — Yield, Tensile, Elongation if present.
8. CVN (Charpy V-Notch) — Extract ALL impact test data. Temperature, energy (ft-lbs/Joules), acceptance.
9. Killed Fine Grain Practice — "fully killed", "killed steel", "fine grain practice". true/false.
10. No Weld Repair — "no weld repair", "no repair welding". true/false.
11. PSL Designation (API only) — PSL1 or PSL2 if present.

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
- killedFineGrainPractice: true only if the MTR explicitly states this.
- noWeldRepair: true only if the MTR explicitly states this.
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
