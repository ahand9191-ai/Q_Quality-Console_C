'use client';

import { useState, useCallback } from 'react';

interface DrawingData {
  jobNumber: string;
  jobName: string;
  structureType: string;
  material: string;
  weldingCode: string;
  bridgeId: string;
  dimensions: {
    bridgeLength: string;
    camber: string;
    railHeight: string;
    deckWidth: string;
    diaphragmSpacing: string;
    postBlockSpacing: string;
    sideDamHeight: string;
    endDamHeight: string;
    overallHeight: string;
    topWidth: string;
    bearingWidth: string;
    otherDims: Record<string, string>;
  };
  plaque: { designLoad: string; loadLimit: string; bridgeId: string };
  parts: { name: string; size: string; material: string }[];
  welding: { weldTypes: string[]; ndtRequirements: string[]; process: string };
  bolts: { type: string; pretension: string; qty: string };
  studs: { qty: string; layout: string; spacing: string };
  aiscNotes: string[];
  extractionConfidence: string;
}

const STRUCTURE_TYPES = ['Truss', 'Bolted Truss', 'Modular', 'Tower', 'Railing', 'Landing'];
const MATERIALS = ['Weathering', 'Painted - G50', 'Painted - A500', 'Galvanized', 'Galvanized - Painted', 'Metalized - Painted', 'Aluminum'];
const WELD_CODES = ['AWS D1.1 - FCAW', 'AWS D1.1 - GMAW', 'AWS D1.5 - FCAW', 'AWS D1.5 - FCAW FC', 'AWS D1.2 - GMAW'];

export default function DrawingInspection() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DrawingData | null>(null);
  const [method, setMethod] = useState('');
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setFile(f);
    setError(null);
    setData(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/drawing-extract', { method: 'POST', body: formData });
      const result = await res.json();
      if (!result.success) {
        setError(result.error || 'Extraction failed');
      } else {
        setData(result.drawingData);
        setMethod(result.extractionMethod || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      // Fetch the blank template from public directory
      const templateRes = await fetch('/QC_Report_blank.xlsx');
      const templateBuf = await templateRes.arrayBuffer();
      
      // Read with SheetJS
      const XLSX = await import('xlsx');
      const wb = XLSX.read(templateBuf, { type: 'array' });
      
      // Helper to set cell value
      const setCell = (sheetName: string, addr: string, value: string) => {
        const ws = wb.Sheets[sheetName];
        if (ws) {
          if (!ws[addr]) ws[addr] = { t: 's', v: value };
          else ws[addr].v = value;
        }
      };
      
      // Fill Pre-Fab sheet
      setCell('Pre-Fab', 'E1', data.jobNumber || '');
      setCell('Pre-Fab', 'E2', data.jobName || '');
      setCell('Pre-Fab', 'Q1', data.structureType || '');
      setCell('Pre-Fab', 'Q2', data.material || '');
      
      // Fill Assembly QC Check sheet
      setCell('Assembly -QC Check', 'E1', data.jobNumber || '');
      setCell('Assembly -QC Check', 'E2', data.jobName || '');
      setCell('Assembly -QC Check', 'Q1', data.structureType || '');
      setCell('Assembly -QC Check', 'Q2', data.weldingCode || '');
      
      // Fill print dimensions
      const d = data.dimensions || {};
      if (d.bridgeLength) setCell('Assembly -QC Check', 'I6', d.bridgeLength);
      if (d.camber) setCell('Assembly -QC Check', 'I7', d.camber);
      if (d.railHeight) setCell('Assembly -QC Check', 'I8', d.railHeight);
      if (d.postBlockSpacing) setCell('Assembly -QC Check', 'I10', d.postBlockSpacing);
      if (d.diaphragmSpacing) setCell('Assembly -QC Check', 'I11', d.diaphragmSpacing);
      if (d.deckWidth) setCell('Assembly -QC Check', 'I12', d.deckWidth);
      if (d.sideDamHeight) setCell('Assembly -QC Check', 'I13', d.sideDamHeight);
      if (d.endDamHeight) setCell('Assembly -QC Check', 'I14', d.endDamHeight);
      
      // Fill Finishing sheet
      setCell('Finishing', 'E1', data.jobNumber || '');
      setCell('Finishing', 'E2', data.jobName || '');
      
      // Blasting and coating from material type
      const mat = (data.material || '').toLowerCase();
      if (mat.includes('weathering')) {
        setCell('Finishing', 'E5', 'SSPC-SP7');
        setCell('Finishing', 'E6', 'N/A');
      } else if (mat.includes('galvan')) {
        setCell('Finishing', 'E5', 'SSPC-SP6');
        setCell('Finishing', 'E6', 'Galvanized');
      } else if (mat.includes('painted')) {
        setCell('Finishing', 'E5', 'SSPC-SP7');
        setCell('Finishing', 'E6', 'Painted');
      }
      
      // Plaque info
      const p = data.plaque || {};
      if (p.designLoad) setCell('Finishing', 'I10', p.designLoad);
      if (p.loadLimit) setCell('Finishing', 'I11', p.loadLimit);
      if (data.bridgeId || p.bridgeId) setCell('Finishing', 'E12', data.bridgeId || p.bridgeId);
      
      // Generate the Excel file
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC_Report_${data.jobNumber || 'extract'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => { setFile(null); setData(null); setError(null); setMethod(''); };

  if (loading) {
    return (
      <div className="processing">
        <div className="spinner" />
        <h2>Analyzing Drawing...</h2>
        <div className="step">Extracting text → GPT-4o structural analysis → QC data mapping</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <div className="error"><h3>Extraction Error</h3><p>{error}</p><button className="btn" style={{ marginTop: 16 }} onClick={reset}>Try Again</button></div>
      </div>
    );
  }

  // Upload screen
  if (!data) {
    return (
      <div>
        <div className="upload-zone" style={{ border: dragging ? '2px dashed var(--accent)' : '2px dashed var(--border)', padding: '50px 40px' }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('drawing-input')?.click()}>
          <input id="drawing-input" type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          {file ? (
            <><div className="icon">📐</div><h2>{file.name}</h2><p>{(file.size / 1024 / 1024).toFixed(2)} MB — Click to change</p></>
          ) : (
            <><div className="icon">📐</div><h2>Drop Drawing PDF Here</h2><p>Structural drawings, fabrication drawings, or erection plans</p></>
          )}
        </div>
        {file && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn" onClick={handleSubmit} style={{ fontSize: 15, padding: '12px 32px' }}>Extract Drawing Data →</button>
          </div>
        )}
        <div className="saas-note" style={{ marginTop: 24 }}>
          <strong>Drawing Inspection</strong> — Upload structural drawings to auto-extract job info, dimensions, materials, and welding requirements. The system generates a filled QC report template ready for inspection.
        </div>
      </div>
    );
  }

  // Results screen
  return (
    <div className="results">
      <div className="results-header no-print">
        <h2>Drawing Extraction Results</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={reset}>New Drawing</button>
          <button className="btn" onClick={generateReport} disabled={generating}>
            {generating ? 'Generating...' : 'Download QC Report (Excel)'}
          </button>
        </div>
      </div>

      {method && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontFamily: '-apple-system, system-ui, sans-serif' }}>
          Extraction method: {method === 'text' ? 'Direct text extraction' : 'AWS Textract OCR'}
          {data.extractionConfidence && ` · Confidence: ${data.extractionConfidence}`}
        </div>
      )}

      {/* Job Information */}
      <div className="data-card">
        <h3>Job Information</h3>
        <div className="field-grid">
          <div className="field-row"><div className="field-label">Job Number</div><div className="field-value">{data.jobNumber || '—'}</div></div>
          <div className="field-row"><div className="field-label">Job Name</div><div className="field-value">{data.jobName || '—'}</div></div>
          <div className="field-row"><div className="field-label">Structure Type</div><div className="field-value">{data.structureType || '—'}</div></div>
          <div className="field-row"><div className="field-label">Material</div><div className="field-value">{data.material || '—'}</div></div>
          <div className="field-row"><div className="field-label">Welding Code & Process</div><div className="field-value">{data.weldingCode || '—'}</div></div>
          <div className="field-row"><div className="field-label">Bridge ID</div><div className="field-value">{data.bridgeId || data.plaque?.bridgeId || '—'}</div></div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="data-card">
        <h3>Dimensions (from Drawing)</h3>
        <div className="field-grid">
          {data.dimensions && Object.entries(data.dimensions).filter(([k, v]) => k !== 'otherDims' && v).map(([key, val]) => (
            <div className="field-row" key={key}>
              <div className="field-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}</div>
              <div className="field-value">{String(val)}</div>
            </div>
          ))}
          {data.dimensions?.otherDims && Object.entries(data.dimensions.otherDims).map(([k, v]) => (
            <div className="field-row" key={k}>
              <div className="field-label">{k}</div>
              <div className="field-value">{String(v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Plaque Information */}
      <div className="data-card">
        <h3>Plaque / Load Information</h3>
        <div className="field-grid">
          <div className="field-row"><div className="field-label">Design Load</div><div className="field-value">{data.plaque?.designLoad || '—'}</div></div>
          <div className="field-row"><div className="field-label">Load Limit</div><div className="field-value">{data.plaque?.loadLimit || '—'}</div></div>
          <div className="field-row"><div className="field-label">Bridge ID</div><div className="field-value">{data.plaque?.bridgeId || data.bridgeId || '—'}</div></div>
        </div>
      </div>

      {/* Parts and Materials */}
      {data.parts && data.parts.length > 0 && (
        <div className="data-card">
          <h3>Parts & Materials</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="chem-table">
              <thead><tr><th>Part</th><th>Size</th><th>Material Spec</th></tr></thead>
              <tbody>
                {data.parts.map((p, i) => (
                  <tr key={i}><td>{p.name}</td><td>{p.size || '—'}</td><td>{p.material || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Welding Information */}
      <div className="data-card">
        <h3>Welding Information</h3>
        <div className="field-grid">
          <div className="field-row"><div className="field-label">Weld Types</div><div className="field-value">{data.welding?.weldTypes?.join(', ') || '—'}</div></div>
          <div className="field-row"><div className="field-label">NDT Requirements</div><div className="field-value">{data.welding?.ndtRequirements?.join(', ') || '—'}</div></div>
          <div className="field-row"><div className="field-label">Process</div><div className="field-value">{data.welding?.process || '—'}</div></div>
          <div className="field-row"><div className="field-label">Bolt Type</div><div className="field-value">{data.bolts?.type || '—'}</div></div>
          <div className="field-row"><div className="field-label">Bolt Pretension</div><div className="field-value">{data.bolts?.pretension || '—'}</div></div>
        </div>
      </div>

      {/* AISC Compliance Notes */}
      {data.aiscNotes && data.aiscNotes.length > 0 && (
        <div className="data-card">
          <h3>AISC Compliance Notes</h3>
          <ul style={{ fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', paddingLeft: 20 }}>
            {data.aiscNotes.map((note, i) => <li key={i} style={{ marginBottom: 4 }}>{note}</li>)}
          </ul>
        </div>
      )}

      {/* AISC Compliance Checklist */}
      <div className="data-card">
        <h3>AISC 207-23 Compliance Checklist</h3>
        <div className="compliance-grid">
          <div className={`compliance-item ${data.jobNumber ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.jobNumber ? '✓' : '✗'}</div>
            <div><div className="compliance-label">Job Number Identified</div><div className="compliance-status">{data.jobNumber ? 'Found in title block' : 'Not found'}</div></div>
          </div>
          <div className={`compliance-item ${data.structureType ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.structureType ? '✓' : '✗'}</div>
            <div><div className="compliance-label">Structure Type Classified</div><div className="compliance-status">{data.structureType || 'Not identified'}</div></div>
          </div>
          <div className={`compliance-item ${data.weldingCode ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.weldingCode ? '✓' : '✗'}</div>
            <div><div className="compliance-label">Welding Code Referenced</div><div className="compliance-status">{data.weldingCode || 'Not specified'}</div></div>
          </div>
          <div className={`compliance-item ${data.dimensions?.bridgeLength ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.dimensions?.bridgeLength ? '✓' : '✗'}</div>
            <div><div className="compliance-label">Bridge Length Documented</div><div className="compliance-status">{data.dimensions?.bridgeLength || 'Not found'}</div></div>
          </div>
          <div className={`compliance-item ${data.material ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.material ? '✓' : '✗'}</div>
            <div><div className="compliance-label">Material Type Specified</div><div className="compliance-status">{data.material || 'Not specified'}</div></div>
          </div>
          <div className={`compliance-item ${data.welding?.ndtRequirements?.length ? 'pass' : 'fail'}`}>
            <div className="compliance-icon">{data.welding?.ndtRequirements?.length ? '✓' : '✗'}</div>
            <div><div className="compliance-label">NDT Requirements Listed</div><div className="compliance-status">{data.welding?.ndtRequirements?.join(', ') || 'Not specified'}</div></div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
          Per AISC 207-23, QC documentation must include material traceability (MTRs), dimensional inspection, weld inspection records (Visual + NDT), and nonconformance tracking. This checklist verifies the drawing contains the information needed for AISC-compliant QC reports.
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn btn-outline" onClick={reset}>New Drawing</button>
        <button className="btn" onClick={generateReport} disabled={generating} style={{ fontSize: 14, padding: '10px 24px' }}>
          {generating ? 'Generating Excel...' : 'Download QC Report (Excel)'}
        </button>
      </div>
    </div>
  );
}
