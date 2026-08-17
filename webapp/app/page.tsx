'use client';

import { useState, useCallback } from 'react';

interface ExtractedData {
  heatNumbers: string[];
  specifications: string[];
  grade: string;
  sizes: string[];
  materialType: string;
  countryOfOrigin: string;
  chemistryByHeat: Record<string, Record<string, number | string>>;
  mechanicalProperties: Record<string, Record<string, string>>;
  cvnByHeat: Record<string, Record<string, string>>;
  killedFineGrainPractice: boolean;
  noWeldRepair: boolean;
  notes: string;
  extractionConfidence: string;
}

interface ExtractResponse {
  success: boolean;
  error?: string;
  extractionMethod?: string;
  textLength?: number;
  extractedData?: ExtractedData;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [method, setMethod] = useState<string>('');
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

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
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">MTR Verification — Domestic Steel Compliance</div>
        </div>
        <div className="processing">
          <div className="spinner" />
          <h2>Processing MTR...</h2>
          <div className="step">Extracting text → GPT-4o field mapping</div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">MTR Verification — Domestic Steel Compliance</div>
        </div>

        <div className="results">
          <div className="results-header">
            <h2>Extraction Results</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {method && (
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
                  Method: {method === 'text' ? 'Direct text extraction' : 'AWS Textract OCR'}
                </span>
              )}
              <button className="btn btn-outline" onClick={reset}>Upload Another</button>
            </div>
          </div>

          {/* Compliance Checks */}
          <div className="data-card">
            <h3>Compliance Statements</h3>
            <div className="compliance-grid">
              <ComplianceCheck label="Killed Fine Grain Practice" passed={result.killedFineGrainPractice} />
              <ComplianceCheck label="No Weld Repair" passed={result.noWeldRepair} />
              <ComplianceCheck label="Country of Origin (Domestic)" passed={result.countryOfOrigin?.toLowerCase().includes('usa') || result.countryOfOrigin?.toLowerCase().includes('america')} />
            </div>
          </div>

          {/* Core Fields */}
          <div className="data-card">
            <h3>Core MTR Data</h3>
            <div className="field-grid">
              <FieldRow label="Heat Numbers" value={result.heatNumbers?.join(', ') || ''} critical />
              <FieldRow label="Specifications" value={result.specifications?.join(', ') || ''} critical />
              <FieldRow label="Grade" value={result.grade || ''} critical />
              <FieldRow label="Size / Designation" value={result.sizes?.join(', ') || ''} critical />
              <FieldRow label="Material Type" value={result.materialType || ''} critical />
              <FieldRow label="Country of Origin" value={result.countryOfOrigin || ''} critical />
              <FieldRow label="Extraction Confidence" value={result.extractionConfidence || 'unknown'} />
            </div>
          </div>

          {/* Chemistry */}
          {result.chemistryByHeat && Object.keys(result.chemistryByHeat).length > 0 && (
            <ChemistryTable data={result.chemistryByHeat} />
          )}

          {/* Mechanical Properties */}
          {result.mechanicalProperties && Object.keys(result.mechanicalProperties).length > 0 && (
            <div className="data-card">
              <h3>Mechanical Properties by Heat</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="chem-table">
                  <thead>
                    <tr>
                      <th>Heat #</th>
                      <th>Yield (ksi)</th>
                      <th>Tensile (ksi)</th>
                      <th>Elongation (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.mechanicalProperties).map(([heat, props]) => (
                      <tr key={heat}>
                        <td>{heat}</td>
                        <td>{props.yield || '—'}</td>
                        <td>{props.tensile || '—'}</td>
                        <td>{props.elongation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CVN / Charpy V-Notch */}
          {result.cvnByHeat && Object.keys(result.cvnByHeat).length > 0 && (
            <div className="data-card">
              <h3>CVN (Charpy V-Notch) Impact Tests</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="chem-table">
                  <thead>
                    <tr>
                      <th>Heat #</th>
                      <th>Temperature</th>
                      <th>Energy (ft-lbs)</th>
                      <th>Acceptance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.cvnByHeat).map(([heat, cvn]) => (
                      <tr key={heat}>
                        <td>{heat}</td>
                        <td>{cvn.temperature || '—'}</td>
                        <td>{cvn.energy_ft_lbs || cvn.energy || '—'}</td>
                        <td>{cvn.acceptance || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {result.notes && (
            <div className="data-card">
              <h3>Notes</h3>
              <p style={{ fontSize: 14, fontFamily: '-apple-system, system-ui, sans-serif' }}>
                {result.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>Q.C. Quality Console</h1>
          <div className="subtitle">MTR Verification — Domestic Steel Compliance</div>
        </div>
        <div className="error">
          <h3>Extraction Error</h3>
          <p>{error}</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={reset}>Try Again</button>
        </div>
      </div>
    );
  }

  // Upload view
  return (
    <div className="container">
      <div className="header">
        <h1>Q.C. Quality Console</h1>
        <div className="subtitle">MTR Verification — Domestic Steel Compliance</div>
      </div>

      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
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
          <button className="btn" onClick={handleSubmit} style={{ fontSize: 15, padding: '12px 32px' }}>
            Extract MTR Data →
          </button>
        </div>
      )}

      <div style={{ marginTop: 40, fontSize: 12, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <p style={{ marginBottom: 6 }}>
          <strong>Pipeline:</strong> PDF text extraction → GPT-4o (field mapping + chemistry + CVN + compliance)
        </p>
        <p>Verifies against ASTM A588/A709 Grade 50W, AWS D1.1/D1.5, and Buy America requirements.</p>
      </div>
    </div>
  );
}

function FieldRow({ label, value, critical }: { label: string; value: string; critical?: boolean }) {
  return (
    <div className="field-row">
      <div className="field-label">
        {label}
        {critical && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>★</span>}
      </div>
      <div className={`field-value ${value ? '' : 'empty'}`}>
        {value || '— not found —'}
      </div>
    </div>
  );
}

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

function ChemistryTable({ data }: { data: Record<string, Record<string, number | string>> }) {
  const elements = ['C', 'Mn', 'P', 'S', 'Si', 'Cu', 'Ni', 'Cr', 'V', 'Mo', 'Nb', 'CE'];
  const heats = Object.keys(data);

  const limits: Record<string, { max: number; label: string }> = {
    C: { max: 0.12, label: '≤ 0.12% (D1.5)' },
    Mn: { max: 1.25, label: '≤ 1.25% (A709 Table 4)' },
    P: { max: 0.04, label: '≤ 0.04%' },
    S: { max: 0.05, label: '≤ 0.05%' },
    CE: { max: 0.47, label: '≤ 0.47% (D1.1/D1.5)' },
  };

  const checkLimit = (el: string, value: number | string): 'pass' | 'fail' | 'none' => {
    if (value === '' || value === null || value === undefined) return 'none';
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numVal)) return 'none';
    const limit = limits[el];
    if (!limit) return 'pass';
    return numVal <= limit.max ? 'pass' : 'fail';
  };

  return (
    <div className="data-card">
      <h3>Chemical Composition by Heat</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="chem-table">
          <thead>
            <tr>
              <th>Heat #</th>
              {elements.map(el => <th key={el}>{el}</th>)}
            </tr>
          </thead>
          <tbody>
            {heats.map(heat => (
              <tr key={heat}>
                <td>{heat}</td>
                {elements.map(el => {
                  const val = data[heat]?.[el];
                  const status = checkLimit(el, val ?? '');
                  return (
                    <td key={el}>
                      {val !== undefined && val !== '' ? (
                        <>
                          {val}
                          {status === 'fail' && <span className="badge badge-fail" style={{ marginLeft: 4 }}>FAIL</span>}
                          {status === 'pass' && limits[el] && <span className="badge badge-pass" style={{ marginLeft: 4 }}>✓</span>}
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
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <p>Spec limits: C ≤ 0.12% (D1.5 Cl 5.4.2) | Mn ≤ 1.25% (A709 Table 4, flange ≤ 3/4&quot;) | P ≤ 0.04% | S ≤ 0.05% | CE ≤ 0.47% (D1.1/D1.5)</p>
      </div>
    </div>
  );
}
