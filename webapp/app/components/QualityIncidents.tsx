'use client';

import { useState, useEffect } from 'react';

interface Incident {
  id: string;
  date: string;
  jobNumber: string;
  description: string;
  type: string;
  rootCause: string;
  correctiveAction: string;
  disposition: string;
  resolvedBy: string;
  resolutionDate: string;
  status: string;
}

const STORAGE_KEY = 'qc_quality_incidents';

const INCIDENT_TYPES = [
  'Material Nonconformance',
  'Dimensional Deviation',
  'Weld Defect',
  'Surface Defect',
  'Coating Defect',
  'Documentation Error',
  'Calibration Failure',
  'Welder Qualification Lapse',
  'Other',
];

const DISPOSITIONS = [
  'Accept as-is',
  'Rework',
  'Repair',
  'Reject/Scrap',
  'Use as-is (engineering approval)',
  'Pending Review',
];

export default function QualityIncidents({ onBack }: { onBack: () => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Incident>({
    id: '', date: '', jobNumber: '', description: '', type: 'Material Nonconformance',
    rootCause: '', correctiveAction: '', disposition: 'Pending Review', resolvedBy: '',
    resolutionDate: '', status: 'Open',
  });

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) setIncidents(JSON.parse(data));
  }, []);

  const save = (list: Incident[]) => {
    setIncidents(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.description) return;
    const item = { ...form, date: form.date || new Date().toISOString().split('T')[0] };
    if (editId) {
      save(incidents.map(i => i.id === editId ? item : i));
    } else {
      save([...incidents, { ...item, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = (id: string) => save(incidents.filter(i => i.id !== id));

  const openCount = incidents.filter(i => i.status === 'Open').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;

  return (
    <div>
      <div className="results-header no-print">
        <h2>Quality Incident Reports</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={onBack}>← Dashboard</button>
          <button className="btn" onClick={() => { setShowForm(true); setEditId(null); setForm({ id: '', date: '', jobNumber: '', description: '', type: 'Material Nonconformance', rootCause: '', correctiveAction: '', disposition: 'Pending Review', resolvedBy: '', resolutionDate: '', status: 'Open' }); }}>+ New Incident</button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontFamily: 'Georgia, serif', color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
        AISC 207-23 requires all nonconformances to be documented, investigated, and resolved with appropriate disposition. Quality incidents must track root cause analysis, corrective actions, and final resolution. These records are reviewable during AISC audits.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>{incidents.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Incidents</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c45a2d30', background: 'rgba(196,90,45,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c45a2d' }}>{openCount}</div>
          <div style={{ fontSize: 11, color: '#c45a2d' }}>Open</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #2d7a3e30', background: 'rgba(45,122,62,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#2d7a3e' }}>{resolvedCount}</div>
          <div style={{ fontSize: 11, color: '#2d7a3e' }}>Resolved</div>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, marginBottom: 16 }}>{editId ? 'Edit Incident' : 'New Quality Incident'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div><label style={labelStyle}>Date</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label style={labelStyle}>Job Number</label><input style={inputStyle} value={form.jobNumber} onChange={e => setForm({ ...form, jobNumber: e.target.value })} placeholder="838093-010" /></div>
            <div><label style={labelStyle}>Incident Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Description *</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the nonconformance or quality issue..." /></div>
            <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Root Cause Analysis</label><textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={form.rootCause} onChange={e => setForm({ ...form, rootCause: e.target.value })} placeholder="What caused this issue? (material, process, personnel, equipment)" /></div>
            <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Corrective Action</label><textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={form.correctiveAction} onChange={e => setForm({ ...form, correctiveAction: e.target.value })} placeholder="What corrective action was taken to resolve and prevent recurrence?" /></div>
            <div><label style={labelStyle}>Disposition</label><select style={inputStyle} value={form.disposition} onChange={e => setForm({ ...form, disposition: e.target.value })}>{DISPOSITIONS.map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label style={labelStyle}>Resolved By</label><input style={inputStyle} value={form.resolvedBy} onChange={e => setForm({ ...form, resolvedBy: e.target.value })} placeholder="CWI name" /></div>
            <div><label style={labelStyle}>Resolution Date</label><input type="date" style={inputStyle} value={form.resolutionDate} onChange={e => setForm({ ...form, resolutionDate: e.target.value })} /></div>
            <div><label style={labelStyle}>Status</label><select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleSubmit} style={{ fontSize: 13 }}>{editId ? 'Update' : 'Create Incident'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {incidents.length === 0 ? (
        <div className="saas-note" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>No quality incidents logged. This is a good thing — but AISC requires documentation when nonconformances occur.</p>
        </div>
      ) : (
        <div>
          {incidents.map(inc => (
            <div key={inc.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 3, color: inc.status === 'Resolved' ? '#2d7a3e' : inc.status === 'Open' ? '#c45a2d' : '#888', background: (inc.status === 'Resolved' ? '#2d7a3e' : inc.status === 'Open' ? '#c45a2d' : '#888') + '15', border: `1px solid ${(inc.status === 'Resolved' ? '#2d7a3e' : inc.status === 'Open' ? '#c45a2d' : '#888')}30` }}>
                    {inc.status}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>{inc.type}</span>
                </div>
                <div>
                  <button onClick={() => { setForm(inc); setEditId(inc.id); setShowForm(true); }} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(inc.id)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #c0392b30', borderRadius: 4, background: 'rgba(192,57,43,0.05)', color: '#c0392b', cursor: 'pointer', marginLeft: 4 }}>Del</button>
                </div>
              </div>
              <div style={{ fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', marginBottom: 6 }}>{inc.description}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
                {inc.date} · Job {inc.jobNumber || 'N/A'} · Disposition: {inc.disposition}
                {inc.resolvedBy && ` · By: ${inc.resolvedBy}`}
              </div>
              {inc.rootCause && <div style={{ fontSize: 11, marginTop: 6, fontFamily: '-apple-system, system-ui, sans-serif' }}><strong>Root Cause:</strong> {inc.rootCause}</div>}
              {inc.correctiveAction && <div style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif' }}><strong>Corrective Action:</strong> {inc.correctiveAction}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4,
  fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', background: 'var(--card)', marginTop: 4, boxSizing: 'border-box',
};
