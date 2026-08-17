import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { drawingData } = body;

    if (!drawingData) {
      return NextResponse.json({ success: false, error: 'No drawing data provided' }, { status: 400 });
    }

    // Load the blank template
    const templatePath = path.join(process.cwd(), 'templates', 'QC_Report_blank.xlsx');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);

    // === Fill Pre-Fab Sheet ===
    const preFab = wb.getWorksheet('Pre-Fab');
    if (preFab) {
      if (drawingData.jobNumber) preFab.getCell('E1').value = drawingData.jobNumber;
      if (drawingData.jobName) preFab.getCell('E2').value = drawingData.jobName;
      if (drawingData.structureType) preFab.getCell('Q1').value = drawingData.structureType;
      if (drawingData.material) preFab.getCell('Q2').value = drawingData.material;
    }

    // === Fill Assembly QC Check Sheet ===
    const assembly = wb.getWorksheet('Assembly -QC Check');
    if (assembly) {
      if (drawingData.jobNumber) assembly.getCell('E1').value = drawingData.jobNumber;
      if (drawingData.jobName) assembly.getCell('E2').value = drawingData.jobName;
      if (drawingData.structureType) assembly.getCell('Q1').value = drawingData.structureType;
      if (drawingData.weldingCode) assembly.getCell('Q2').value = drawingData.weldingCode;

      // Fill print dimensions (column I)
      const dims = drawingData.dimensions || {};
      const dimMap: Record<string, string> = {
        'bridgeLength': 'I6',
        'camber': 'I7',
        'railHeight': 'I8',
        'postBlockSpacing': 'I10',
        'diaphragmSpacing': 'I11',
        'deckWidth': 'I12',
        'sideDamHeight': 'I13',
        'endDamHeight': 'I14',
        'boltsSnugTightened': 'I15',
        'boltsPretensioned': 'I16',
        'studsQualified': 'I17',
        'studsPinged': 'I18',
        'studsRepaired': 'I19',
      };

      for (const [key, cell] of Object.entries(dimMap)) {
        if ((dims as any)[key]) {
          assembly.getCell(cell).value = (dims as any)[key];
        }
      }

      // Fill weld inspection data
      const welding = drawingData.welding || {};
      if (welding.ndtRequirements?.includes('Visual')) {
        assembly.getCell('N28').value = 'All Welds';
        assembly.getCell('K28').value = 1;
      }
      if (welding.ndtRequirements?.includes('UT') || welding.ndtRequirements?.includes('Ultrasound')) {
        assembly.getCell('K29').value = 'N/A';
        assembly.getCell('N29').value = "CJP's";
      }
      if (welding.ndtRequirements?.includes('MT') || welding.ndtRequirements?.includes('Mag Particle')) {
        assembly.getCell('K30').value = 0.1;
        assembly.getCell('N30').value = 'FILLETS AND PJP';
      }
    }

    // === Fill Finishing Sheet ===
    const finishing = wb.getWorksheet('Finishing');
    if (finishing) {
      if (drawingData.jobNumber) finishing.getCell('E1').value = drawingData.jobNumber;
      if (drawingData.jobName) finishing.getCell('E2').value = drawingData.jobName;

      // Blasting and coating specs from material type
      const material = drawingData.material || '';
      if (material.toLowerCase().includes('weathering')) {
        finishing.getCell('E5').value = 'SSPC-SP7';
        finishing.getCell('E6').value = 'N/A';
      } else if (material.toLowerCase().includes('galvan')) {
        finishing.getCell('E5').value = 'SSPC-SP6';
        finishing.getCell('E6').value = 'Galvanized';
      } else if (material.toLowerCase().includes('painted')) {
        finishing.getCell('E5').value = 'SSPC-SP7';
        finishing.getCell('E6').value = 'Painted';
      }

      // Plaque info
      const plaque = drawingData.plaque || {};
      if (plaque.designLoad) finishing.getCell('I10').value = plaque.designLoad;
      if (plaque.loadLimit) finishing.getCell('I11').value = plaque.loadLimit;
      if (drawingData.bridgeId || plaque.bridgeId) finishing.getCell('E12').value = drawingData.bridgeId || plaque.bridgeId;
    }

    // Generate the Excel file as buffer
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="QC_Report_${drawingData.jobNumber || 'extract'}.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('QC report generation error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
