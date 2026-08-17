'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./components/PdfViewer'), { ssr: false });

// ─── Types ───
interface StampConfig {
  name: string;
  title: string;
  company: string;
  color: 'green' | 'blue' | 'red' | 'black';
  shape: 'circular' | 'rectangular';
}

interface CodeLimits {
  name: string;
  elements: Record<string, { max?: number; min?: number; label: string; desc: string }>;
  ceMax: number;
  ceFormula: string;
  ceDesc: string;
  notes: string;
}

interface ExtractedData {
  heatNumbers: string[];
  specifications: string[];
  grade: string;
  sizes: string[];
  shape: string;
  materialType: string;
  countryOfOrigin: string;
  psl?: string;
  chemistryByHeat: Record<string, Record<string, number | string>>;
  mechanicalProperties: Record<string, Record<string, string>>;
  cvnByHeat: Record<string, Record<string, string>>;
  killedFineGrainPractice: boolean;
  noWeldRepair: boolean;
  notes: string;
  extractionConfidence: string;
}

interface MtrHistoryEntry {
  id: string;
  date: string;
  fileName: string;
  code: string;
  extractedData: ExtractedData;
  codeName: string;
}

interface ExtractResponse {
  success: boolean;
  error?: string;
  extractionMethod?: string;
  textLength?: number;
  code?: string;
  codeLimits?: CodeLimits;
  extractedData?: ExtractedData;
}

const CODES = [
  { id: 'AWS D1.1', label: 'AWS D1.1', sub: 'Structural Welding Code (Steel)' },
  { id: 'AWS D1.5', label: 'AWS D1.5', sub: 'Bridge Welding Code' },
  { id: 'ASME', label: 'ASME BPVC', sub: 'Boiler & Pressure Vessel Code' },
  { id: 'API', label: 'API 5L', sub: 'Pipeline Steel (American Petroleum Institute)' },
];

// ─── Password Gate (simple, client-side — upgrade to real auth for SaaS) ───
const APP_PASSWORD = 'qc2026';

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  // Core app state
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [method, setMethod] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('AWS D1.5');
  const [codeLimits, setCodeLimits] = useState<CodeLimits | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stamp, setStamp] = useState<StampConfig | null>(null);
  const [showStampDesigner, setShowStampDesigner] = useState(false);
  const [history, setHistory] = useState<MtrHistoryEntry[]>([]);
  const [viewingHistory, setViewingHistory] = useState<MtrHistoryEntry | null>(null);

  // Check auth on mount
  useEffect(() => {
    if (sessionStorage.getItem('qc_authed') === 'true') setAuthed(true);
    // Load stamp
    const saved = localStorage.getItem('qc_stamp');
    if (saved) { try { setStamp(JSON.parse(saved)); } catch {} }
    // Load history
    loadHistory();
  }, []);

  const loadHistory = () => {
    const saved = localStorage.getItem('mtr_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch {}
    }
  };

  const saveToHistory = (fileName: string, code: string, data: ExtractedData, codeName: string) => {
    const entry: MtrHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      fileName,
      code,
      extractedData: data,
      codeName,
    };
    const updated = [entry, ...history].slice(0, 50); // keep last 50
    setHistory(updated);
    localStorage.setItem('mtr_history', JSON.stringify(updated));
  };

  const deleteHistoryEntry = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('mtr_history', JSON.stringify(updated));
  };

  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setViewingHistory(null);
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
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('code', selectedCode);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const data: ExtractResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Extraction failed');
      } else {
        setResult(data.extractedData || null);
        setMethod(data.extractionMethod || '');
        setCodeLimits(data.codeLimits || null);
        setStep(2);
        // Save to history
        saveToHistory(file.name, selectedCode, data.extractedData!, data.codeLimits?.name || selectedCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during extraction');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setMethod('');
    setStep(1);
    setViewingHistory(null);
  };

  // ─── CSV Download ───
  const downloadCSV = () => {
    const data = viewingHistory?.extractedData || result;
    if (!data) return;
    const rows: string[] = [];
    rows.push('Field,Value');
    rows.push(`Heat Numbers,${data.heatNumbers?.join('; ') || ''}`);
    rows.push(`Specifications,${data.specifications?.join('; ') || ''}`);
    rows.push(`Grade,${data.grade || ''}`);
    rows.push(`Shape,${data.shape || ''}`);
    rows.push(`Size,${data.sizes?.join('; ') || ''}`);
    rows.push(`Material Type,${data.materialType || ''}`);
    rows.push(`Country of Origin,${data.countryOfOrigin || ''}`);
    rows.push(`Killed Fine Grain,${data.killedFineGrainPractice ? 'Yes' : 'No'}`);
    rows.push(`No Weld Repair,${data.noWeldRepair ? 'Yes' : 'No'}`);
    rows.push('');
    rows.push('Heat,Element,Value');
    if (data.chemistryByHeat) {
      Object.entries(data.chemistryByHeat).forEach(([heat, chem]) => {
        Object.entries(chem).forEach(([el, val]) => {
          if (val !== '' && val !== null && val !== undefined) {
            rows.push(`${heat},${el},${val}`);
          }
        });
      });
    }
    if (data.cvnByHeat) {
      rows.push('');
      rows.push('Heat,Temperature,Energy,Aceptance');
      Object.entries(data.cvnByHeat).forEach(([heat, cvn]) => {
        rows.push(`${heat},${cvn.temperature || ''},${cvn.energy_ft_lbs || cvn.energy || ''},${cvn.acceptance || ''}`);
      });
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTR_${data.heatNumbers?.[0] || 'extract'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Highlight strings for PDF viewer ───
  const getHighlights = (): string[] => {
    const data = viewingHistory?.extractedData || result;
    if (!data) return [];
    const highlights: string[] = [];
    highlights.push(...(data.heatNumbers || []));
    highlights.push(...(data.specifications || []));
    if (data.grade) highlights.push(data.grade);
    if (data.shape) highlights.push(data.shape);
    if (data.countryOfOrigin) highlights.push(data.countryOfOrigin);
    if (data.killedFineGrainPractice) { highlights.push('killed'); highlights.push('fine grain'); }
    if (data.noWeldRepair) { highlights.push('no weld repair'); highlights.push('weld repair'); }
    if (data.cvnByHeat) {
      Object.values(data.cvnByHeat).forEach(cvn => {
        if (cvn.temperature) highlights.push(cvn.temperature);
      });
    }
    if (data.chemistryByHeat) {
      Object.values(data.chemistryByHeat).forEach(chem => {
        Object.entries(chem).forEach(([, val]) => {
          if (val !== '' && val !== null && val !== undefined) highlights.push(String(val));
        });
      });
    }
    return highlights;
  };

  const saveStamp = (config: StampConfig) => {
    setStamp(config);
    localStorage.setItem('qc_stamp', JSON.stringify(config));
    setShowStampDesigner(false);
  };

  // ─── Password Gate ───
  if (!authed) {
    return (
      <div className="container">
        <div className="password-gate">
          <h1>Q.C. Quality Console</h1>
          <p>Authorized access only. Enter your access code to continue.</p>
          {pwError && <div className="password-error">Incorrect access code. Try again.</div>}
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pwInput === APP_PASSWORD) {
                  setAuthed(true);
                  sessionStorage.setItem('qc_authed', 'true');
                } else {
                  setPwError(true);
                }
              }
            }}
            placeholder="Access code"
            autoFocus
          />
          <button
            className="btn"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => {
              if (pwInput === APP_PASSWORD) {
                setAuthed(true);
                sessionStorage.setItem('qc_authed', 'true');
              } else {
                setPwError(true);
              }
            }}
          >
            Enter
          </button>
          <p style={{ marginTop: 20, fontSize: 11 }}>
            Need access? Contact your QC administrator.
          </p>
        </div>
      </div>
    );
  }

  // ─── Step 1: Upload + Code Selection + History ───
  if (step === 1 && !loading && !viewingHistory) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">MTR Verification — Multi-Code Compliance · <span className="no-print" style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => { sessionStorage.removeItem('qc_authed'); setAuthed(false); }}>Logout</span></div>
        </div>

        {/* Code Selector */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', marginBottom: 8 }}>Select Governing Code / Standard</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {CODES.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCode(c.id)}
                style={{
                  padding: '14px 16px', borderRadius: 8,
                  border: selectedCode === c.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: selectedCode === c.id ? 'rgba(26, 58, 92, 0.06)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'Georgia, serif',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: 15, color: selectedCode === c.id ? 'var(--accent)' : 'var(--fg)' }}>{c.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: '-apple-system, system-ui, sans-serif' }}>{c.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          {file ? (
            <>
              <div className="icon">📄</div>
              <h2>{file.name}</h2>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB — Click to change</p>
            </>
          ) : (
            <>
              <div className="icon">📄</div>
              <h2>Drop MTR PDF Here</h2>
              <p>or click to browse — PDF files only</p>
            </>
          )}
        </div>

        {file && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn" onClick={handleSubmit} style={{ fontSize: 15, padding: '12px 32px' }}>Extract MTR Data →</button>
          </div>
        )}

        {/* Stamp config status */}
        <div className="no-print" style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          {stamp ? (
            <>QC Stamp: <strong>{stamp.name}</strong> · <button onClick={() => setShowStampDesigner(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Edit Stamp</button></>
          ) : (
            <button onClick={() => setShowStampDesigner(true)} style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>✎ Create your QC approval stamp</button>
          )}
        </div>

        {showStampDesigner && <StampDesignerModal initial={stamp} onSave={saveStamp} onClose={() => setShowStampDesigner(false)} />}

        {/* MTR History */}
        {history.length > 0 && (
          <div className="history-section no-print">
            <h3>Recent MTRs ({history.length})</h3>
            <div className="history-grid">
              {history.slice(0, 12).map(h => (
                <div key={h.id} className="history-card" onClick={() => { setViewingHistory(h); setCodeLimits(null); }}>
                  <div className="history-card-date">{new Date(h.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="history-card-name">{h.fileName}</div>
                  <div className="history-card-meta">
                    <span className="history-badge">{h.code}</span>
                    {h.extractedData.heatNumbers?.length > 0 && <span className="history-badge">{h.extractedData.heatNumbers.length} heat{h.extractedData.heatNumbers.length > 1 ? 's' : ''}</span>}
                    {h.extractedData.shape && <span className="history-badge">{h.extractedData.shape}</span>}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{h.extractedData.specifications?.join(', ') || '—'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(h.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SaaS note */}
        <div className="saas-note no-print">
          <strong>Q.C. Quality Console</strong> — Professional MTR verification for structural steel, pressure vessels, and pipeline.
          Membership features (multi-user, cloud history, audit trail) coming soon.
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="container">
        <div className="header"><h1>Q.C. Quality Console</h1><div className="subtitle">MTR Verification — {selectedCode}</div></div>
        <div className="processing">
          <div className="spinner" />
          <h2>Processing MTR...</h2>
          <div className="step">Extracting text → GPT-4o field mapping → {selectedCode} chemistry verification</div>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error && step === 1) {
    return (
      <div className="container">
        <div className="header"><h1>Q.C. Quality Console</h1></div>
        <div className="error"><h3>Extraction Error</h3><p>{error}</p><button className="btn" style={{ marginTop: 16 }} onClick={reset}>Try Again</button></div>
      </div>
    );
  }

  // ─── Viewing History (Step 2 without PDF) ───
  if (viewingHistory && !file) {
    const data = viewingHistory.extractedData;
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">History: {viewingHistory.fileName} — {viewingHistory.codeName}</div>
        </div>
        <div className="results">
          <div className="results-header no-print">
            <h2>Previous Extraction Review</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setViewingHistory(null)}>← Back to Home</button>
              <button className="btn" onClick={downloadCSV}>Download CSV</button>
            </div>
          </div>

          <div className="data-card">
            <h3>Core MTR Data</h3>
            <div className="field-grid">
              <FieldRow label="Heat Numbers" value={data.heatNumbers?.join(', ') || ''} critical />
              <FieldRow label="Specifications" value={data.specifications?.join(', ') || ''} critical />
              <FieldRow label="Grade" value={data.grade || ''} critical />
              <FieldRow label="Shape" value={data.shape || ''} critical />
              <FieldRow label="Size / Designation" value={data.sizes?.join(', ') || ''} critical />
              <FieldRow label="Material Type" value={data.materialType || ''} critical />
              <FieldRow label="Country of Origin" value={data.countryOfOrigin || ''} critical />
              <FieldRow label="Extraction Confidence" value={data.extractionConfidence || 'unknown'} />
            </div>
          </div>

          <div className="data-card">
            <h3>Compliance Statements</h3>
            <div className="compliance-grid">
              <ComplianceCheck label="Killed Fine Grain Practice" passed={data.killedFineGrainPractice} />
              <ComplianceCheck label="No Weld Repair" passed={data.noWeldRepair} />
              <ComplianceCheck label="Country of Origin (Domestic)" passed={data.countryOfOrigin?.toLowerCase().includes('usa') || data.countryOfOrigin?.toLowerCase().includes('america')} />
            </div>
          </div>

          {data.chemistryByHeat && Object.keys(data.chemistryByHeat).length > 0 && codeLimits && (
            <ChemistryTable data={data.chemistryByHeat} limits={codeLimits} />
          )}

          {data.cvnByHeat && Object.keys(data.cvnByHeat).length > 0 && (
            <div className="data-card">
              <h3>CVN Impact Tests</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="chem-table">
                  <thead><tr><th>Heat #</th><th>Temperature</th><th>Energy (ft-lbs)</th><th>Acceptance</th></tr></thead>
                  <tbody>
                    {Object.entries(data.cvnByHeat).map(([heat, cvn]) => (
                      <tr key={heat}><td>{heat}</td><td>{cvn.temperature || '—'}</td><td>{cvn.energy_ft_lbs || cvn.energy || '—'}</td><td>{cvn.acceptance || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="saas-note no-print">
            <strong>Note:</strong> This is a saved extraction from {new Date(viewingHistory.date).toLocaleString()}. Re-upload the PDF for the full approval workflow with highlighting and stamping.
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Review & Chemistry Verification ───
  if (step === 2 && result) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">MTR Verification — {codeLimits?.name || selectedCode}</div>
        </div>
        <div className="results">
          <div className="results-header no-print">
            <h2>Step 2: Extraction & Chemistry Verification</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn" onClick={() => setStep(3)} style={{ fontSize: 12, padding: '8px 20px' }}>Proceed to Approval →</button>
            </div>
          </div>

          {method && (
            <div className="no-print" style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontFamily: '-apple-system, system-ui, sans-serif' }}>
              Extraction method: {method === 'text' ? 'Direct text extraction' : 'AWS Textract OCR'}
            </div>
          )}

          <div className="data-card">
            <h3>Compliance Statements</h3>
            <div className="compliance-grid">
              <ComplianceCheck label="Killed Fine Grain Practice" passed={result.killedFineGrainPractice} />
              <ComplianceCheck label="No Weld Repair" passed={result.noWeldRepair} />
              {selectedCode.startsWith('AWS') && (
                <ComplianceCheck label="Country of Origin (Domestic)" passed={result.countryOfOrigin?.toLowerCase().includes('usa') || result.countryOfOrigin?.toLowerCase().includes('america')} />
              )}
              {selectedCode === 'API' && result.psl && <ComplianceCheck label={`PSL Designation (${result.psl})`} passed={true} />}
            </div>
          </div>

          <div className="data-card">
            <h3>Core MTR Data</h3>
            <div className="field-grid">
              <FieldRow label="Heat Numbers" value={result.heatNumbers?.join(', ') || ''} critical />
              <FieldRow label="Specifications" value={result.specifications?.join(', ') || ''} critical />
              <FieldRow label="Grade" value={result.grade || ''} critical />
              <FieldRow label="Shape" value={result.shape || ''} critical />
              <FieldRow label="Size / Designation" value={result.sizes?.join(', ') || ''} critical />
              <FieldRow label="Material Type" value={result.materialType || ''} critical />
              <FieldRow label="Country of Origin" value={result.countryOfOrigin || ''} critical />
              {result.psl && <FieldRow label="PSL" value={result.psl} critical />}
              <FieldRow label="Extraction Confidence" value={result.extractionConfidence || 'unknown'} />
            </div>
          </div>

          {result.chemistryByHeat && Object.keys(result.chemistryByHeat).length > 0 && codeLimits && (
            <ChemistryTable data={result.chemistryByHeat} limits={codeLimits} />
          )}

          {result.mechanicalProperties && Object.keys(result.mechanicalProperties).length > 0 && (
            <div className="data-card">
              <h3>Mechanical Properties by Heat</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="chem-table">
                  <thead><tr><th>Heat #</th><th>Yield (ksi)</th><th>Tensile (ksi)</th><th>Elongation (%)</th></tr></thead>
                  <tbody>
                    {Object.entries(result.mechanicalProperties).map(([heat, props]) => (
                      <tr key={heat}><td>{heat}</td><td>{props.yield || '—'}</td><td>{props.tensile || '—'}</td><td>{props.elongation || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.cvnByHeat && Object.keys(result.cvnByHeat).length > 0 && (
            <div className="data-card">
              <h3>CVN (Charpy V-Notch) Impact Tests</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="chem-table">
                  <thead><tr><th>Heat #</th><th>Temperature</th><th>Energy (ft-lbs)</th><th>Acceptance</th></tr></thead>
                  <tbody>
                    {Object.entries(result.cvnByHeat).map(([heat, cvn]) => (
                      <tr key={heat}><td>{heat}</td><td>{cvn.temperature || '—'}</td><td>{cvn.energy_ft_lbs || cvn.energy || '—'}</td><td>{cvn.acceptance || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.notes && (
            <div className="data-card"><h3>Notes</h3><p style={{ fontSize: 14, fontFamily: '-apple-system, system-ui, sans-serif' }}>{result.notes}</p></div>
          )}

          <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <button className="btn btn-outline" onClick={downloadCSV}>Download CSV</button>
            <button className="btn btn-outline" onClick={() => window.print()}>Print Certificate</button>
            <button className="btn" onClick={() => setStep(3)}>Proceed to Approval →</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 3: Document Approval ───
  if (step === 3 && result && file) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">Step 3: Document Approval — {codeLimits?.name || selectedCode}</div>
        </div>
        <div className="results">
          <div className="results-header no-print">
            <h2>MTR Document Review & Approval</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setStep(2)} style={{ fontSize: 12 }}>← Back to Chemistry</button>
              <button className="btn btn-outline" onClick={reset} style={{ fontSize: 12 }}>New MTR</button>
            </div>
          </div>

          {!stamp && (
            <div className="data-card no-print" style={{ borderColor: 'rgba(204, 136, 0, 0.5)' }}>
              <h3 style={{ color: '#a87000' }}>⚠ No QC Stamp Configured</h3>
              <p style={{ fontSize: 13, marginBottom: 12 }}>Create your personal approval stamp before approving this MTR.</p>
              <button className="btn" onClick={() => setShowStampDesigner(true)}>Create Stamp</button>
            </div>
          )}

          {showStampDesigner && <StampDesignerModal initial={stamp} onSave={saveStamp} onClose={() => setShowStampDesigner(false)} />}

          {stamp && (
            <div className="data-card">
              <PdfViewer file={file} highlights={getHighlights()} stamp={stamp} onApprove={() => console.log('approved')} onReject={() => console.log('rejected')} />
            </div>
          )}

          <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={downloadCSV}>Download CSV</button>
            <button className="btn btn-outline" onClick={() => window.print()}>Print / Save PDF</button>
          </div>

          {codeLimits && (
            <div className="data-card">
              <h3>{codeLimits.name} — Summary</h3>
              <p style={{ fontSize: 13, marginBottom: 8 }}>{codeLimits.notes}</p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                <p><strong>CE Formula:</strong> {codeLimits.ceFormula}</p>
                <p><strong>CE Limit:</strong> {codeLimits.ceDesc}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Field Row ───
function FieldRow({ label, value, critical }: { label: string; value: string; critical?: boolean }) {
  return (
    <div className="field-row">
      <div className="field-label">{label}{critical && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>★</span>}</div>
      <div className={`field-value ${value ? '' : 'empty'}`}>{value || '— not found —'}</div>
    </div>
  );
}

// ─── Compliance Check ───
function ComplianceCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className={`compliance-item ${passed ? 'pass' : 'fail'}`}>
      <div className="compliance-icon">{passed ? '✓' : '✗'}</div>
      <div>
        <div className="compliance-label">{label}</div>
        <div className="compliance-status">{passed ? 'Verified' : 'Not Found'}</div>
      </div>
    </div>
  );
}

// ─── Chemistry Table ───
function ChemistryTable({ data, limits }: { data: Record<string, Record<string, number | string>>, limits: CodeLimits }) {
  const allElements = ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'Ti', 'CE'];
  const heats = Object.keys(data);
  const elements = allElements.filter(el => heats.some(h => data[h]?.[el] !== undefined && data[h]?.[el] !== ''));

  const checkLimit = (el: string, value: number | string): { status: 'pass' | 'fail' | 'none'; info: string } => {
    if (value === '' || value === null || value === undefined) return { status: 'none', info: '' };
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numVal)) return { status: 'none', info: '' };
    const limit = limits.elements[el];
    if (!limit) return { status: 'pass', info: '' };
    let passed = true;
    if (limit.max !== undefined && numVal > limit.max) passed = false;
    if (limit.min !== undefined && numVal < limit.min) passed = false;
    return { status: passed ? 'pass' : 'fail', info: limit.desc };
  };

  return (
    <div className="data-card">
      <h3>Chemical Composition — {limits.name}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="chem-table">
          <thead>
            <tr>
              <th>Heat #</th>
              {elements.map(el => (
                <th key={el}>
                  {el}
                  {limits.elements[el] && <div style={{ fontSize: 9, fontWeight: 'normal', color: 'var(--muted)', marginTop: 2 }}>{limits.elements[el].label}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heats.map(heat => (
              <tr key={heat}>
                <td>{heat}</td>
                {elements.map(el => {
                  const val = data[heat]?.[el];
                  const { status, info } = checkLimit(el, val ?? '');
                  return (
                    <td key={el} title={info} style={{ cursor: info ? 'help' : 'default' }}>
                      {val !== undefined && val !== '' ? (
                        <>
                          {val}
                          {status === 'fail' && <span className="badge badge-fail" style={{ marginLeft: 4 }}>FAIL</span>}
                          {status === 'pass' && limits.elements[el] && <span className="badge badge-pass" style={{ marginLeft: 4 }}>✓</span>}
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: 14, background: 'rgba(26, 58, 92, 0.03)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: 13, fontFamily: 'Georgia, serif', marginBottom: 10 }}>Chemistry Acceptability Guide — {limits.name}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {elements.map(el => {
            const limit = limits.elements[el];
            if (!limit) return null;
            return (
              <div key={el} style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif' }}>
                <strong>{el}:</strong> <span style={{ color: 'var(--muted)' }}>{limit.label}</span>
                <div style={{ color: 'var(--muted)', marginTop: 2, fontSize: 10 }}>{limit.desc}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 11 }}>
          <strong>CE Formula:</strong> {limits.ceFormula}
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>{limits.ceDesc}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>{limits.notes}</div>
      </div>
    </div>
  );
}

// ─── Stamp Designer Modal ───
function StampDesignerModal({ initial, onSave, onClose }: { initial: StampConfig | null; onSave: (s: StampConfig) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [company, setCompany] = useState(initial?.company || '');
  const [color, setColor] = useState<StampConfig['color']>(initial?.color || 'green');
  const [shape, setShape] = useState<StampConfig['shape']>(initial?.shape || 'circular');

  const stampColors: Record<string, string> = { green: '#22a722', blue: '#2266cc', red: '#cc2222', black: '#333333' };
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: 12, padding: 28, maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Georgia, serif', marginBottom: 4 }}>Create Your QC Approval Stamp</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Your stamp will be applied to approved MTRs as proof of QC review.</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          {shape === 'circular' ? (
            <div style={{ width: 140, height: 140, borderRadius: '50%', border: `3px solid ${stampColors[color]}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 12, boxSizing: 'border-box', background: `${stampColors[color]}08`, transform: 'rotate(-12deg)' }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: stampColors[color], fontFamily: 'Georgia, serif' }}>APPROVED</div>
              <div style={{ fontSize: 9, color: stampColors[color], marginTop: 2 }}>{name || 'Your Name'}</div>
              {title && <div style={{ fontSize: 7, color: stampColors[color], marginTop: 1 }}>{title}</div>}
              <div style={{ fontSize: 8, color: stampColors[color], marginTop: 4 }}>{today}</div>
              {company && <div style={{ fontSize: 7, color: stampColors[color], marginTop: 1 }}>{company}</div>}
            </div>
          ) : (
            <div style={{ border: `3px solid ${stampColors[color]}`, borderRadius: 4, padding: '10px 20px', textAlign: 'center', background: `${stampColors[color]}08`, minWidth: 160, transform: 'rotate(-12deg)' }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: stampColors[color], fontFamily: 'Georgia, serif' }}>APPROVED</div>
              <div style={{ fontSize: 10, color: stampColors[color], marginTop: 2 }}>{name || 'Your Name'}</div>
              {title && <div style={{ fontSize: 8, color: stampColors[color] }}>{title}</div>}
              <div style={{ fontSize: 9, color: stampColors[color], marginTop: 3 }}>{today}</div>
              {company && <div style={{ fontSize: 8, color: stampColors[color] }}>{company}</div>}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Inspector Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Title / Credentials</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Certified Welding Inspector (CWI)" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Company</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company Name LLC" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['green', 'blue', 'red', 'black'] as const).map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', border: color === c ? '3px solid var(--accent)' : '2px solid var(--border)', background: stampColors[c], cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Shape</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShape('circular')} style={{ padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, border: shape === 'circular' ? '2px solid var(--accent)' : '1px solid var(--border)', background: shape === 'circular' ? 'rgba(26,58,92,0.06)' : 'transparent', fontFamily: 'Georgia, serif' }}>Circular</button>
                <button onClick={() => setShape('rectangular')} style={{ padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, border: shape === 'rectangular' ? '2px solid var(--accent)' : '1px solid var(--border)', background: shape === 'rectangular' ? 'rgba(26,58,92,0.06)' : 'transparent', fontFamily: 'Georgia, serif' }}>Rectangular</button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => onSave({ name, title, company, color, shape })} disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }}>Save Stamp</button>
        </div>
      </div>
    </div>
  );
}
