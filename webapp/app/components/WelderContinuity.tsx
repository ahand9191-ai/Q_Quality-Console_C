'use client';

import { useState, useEffect } from 'react';

interface Welder {
  id: string;
  name: string;
  stamp: string;
  process: string; // SMAW, FCAW, GMAW, SAW
  position: string; // 1G, 2G, 3G, 4G, 5G, 6G
  qualificationDate: string;
  lastWeldDate: string;
  expiryDate: string;
  essentialVariables: string;
  status: string;
}

const STORAGE_KEY = 'qc_welder_continuity';

const PROCESSES = ['SMAW', 'FCAW', 'GMAW', 'SAW', 'GTAW'];
const POSITIONS = ['1G', '2G',  '3G', '4G', '5G', '6G', '2F', '3F', '4F', '1F'];

function calculateStatus(lastWeld: string): { status: string; daysRemaining: number; color: string } {
  if (!lastWeld) return { status: 'No Record', daysRemaining: 0, color: '#888' };
  const last = new Date(lastWeld);
  const now = new Date();
  const sixMonthsLater = new Date(last);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  const daysRemaining = Math.ceil((sixMonthsLater.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return { status: 'EXPIRED', daysRemaining, color: '#c0392b' };
  if (daysRemaining <= 30) return { status: 'Expiring Soon', daysRemaining, color: '#c45a2d' };
  return { status: 'Current', daysRemaining, color: '#2d7a3e' };
}

export default function WelderContinuity({ onBack }: { onBack: () => void }) {
  const [welders, setWelders] = useState<Welder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Welder>({
    id: '', name: '', stamp: '', process: 'FCAW', position: '3G',
    qualificationDate: '', lastWeldDate: '', expiryDate: '', essentialVariables: '', status: '',
  });

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) setWelders(JSON.parse(data));
  }, []);

  const save = (list: Welder[]) => {
    setWelders(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.name || !form.stamp) return;
    const status = calculateStatus(form.lastWeldDate);
    if (editId) {
      save(welders.map(w => w.id === editId ? { ...form, status: status.status } : w));
    } else {
      const newWelder: Welder = { ...form, id: Date.now().toString(), status: status.status };
      save([...welders, newWelder]);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ id: '', name: '', stamp: '', process: 'FCAW', position: '3G', qualificationDate: '', lastWeldDate: '', expiryDate: '', essentialVariables: '', status: '' });
  };

  const handleEdit = (w: Welder) => {
    setForm(w);
    setEditId(w.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    save(welders.filter(w => w.id !== id));
  };

  const updateLastWeld = (id: string, date: string) => {
    const status = calculateStatus(date);
    save(welders.map(w => w.id === id ? { ...w, lastWeldDate: date, status: status.status } : w));
  };

  const currentCount = welders.filter(w => calculateStatus(w.lastWeldDate).status === 'Current').length;
  const expiringCount = welders.filter(w => calculateStatus(w.lastWeldDate).status === 'Expiring Soon').length;
  const expiredCount = welders.filter(w => calculateStatus(w.lastWeldDate).status === 'EXPIRED').length;

  return (
    <div>
      <div className="results-header no-print">
        <h2>Welder Continuity Log</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={onBack}>← Dashboard</button>
          <button className="btn" onClick={() => { setShowForm(true); setEditId(null); setForm({ id: '', name: '', stamp: '', process: 'FCAW', position: '3G', qualificationDate: '', lastWeldDate: '', expiryDate: '', essentialVariables: '', status: '' }); }}>+ Add Welder</button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontFamily: 'Georgia, serif', color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
        AWS D1.1/D1.5 requires welders to use each process at least once every 6 months to maintain qualification continuity. This log tracks each welder's last activity date and flags approaching expirations.
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-tile" style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>{welders.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>Total Welders</div>
        </div>
        <div className="stat-tile" style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #2d7a3e30', background: 'rgba(45,122,62,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#2d7a3e' }}>{currentCount}</div>
          <div style={{ fontSize: 11, color: '#2d7a3e', fontFamily: '-apple-system, system-ui, sans-serif' }}>Current</div>
        </div>
        <div className="stat-tile" style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c45a2d30', background: 'rgba(196,90,45,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c45a2d' }}>{expiringCount}</div>
          <div style={{ fontSize: 11, color: '#c45a2d', fontFamily: '-apple-system, system-ui, sans-serif' }}>Expiring ≤30d</div>
        </div>
        <div className="stat-tile" style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c0392b30', background: 'rgba(192,57,43,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c0392b' }}>{expiredCount}</div>
          <div style={{ fontSize: 11, color: '#c0392b', fontFamily: '-apple-system, system-ui, sans-serif' }}>Expired</div>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, marginBottom: 16 }}>{editId ? 'Edit Welder' : 'Add Welder'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Welder Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Welder Stamp/ID *</label><input style={inputStyle} value={form.stamp} onChange={e => setForm({ ...form, stamp: e.target.value })} placeholder="W-001" /></div>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Process</label><select style={inputStyle} value={form.process} onChange={e => setForm({ ...form, process: e.target.value })}>{PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Position</label><select style={inputStyle} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Qualification Date</label><input type="date" style={inputStyle} value={form.qualificationDate} onChange={e => setForm({ ...form, qualificationDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' }}>Last Weld Date</label><input type="date" style={inputStyle} value={form.lastWeldDate} onChange={e => setForm({ ...form, lastWeldDate: e.target.value })} /></div>
            <input style={inputStyle} value={form.essentialVariables} onChange={e => setForm({ ...form, essentialVariables: e.target.value })} placeholder="Thickness range, F-group, diameter, etc." />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleSubmit} style={{ fontSize: 13 }}>{editId ? 'Update' : 'Add Welder'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Welder Table */}
      {welders.length === 0 ? (
        <div className="saas-note" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>No welders logged yet. Click "+ Add Welder" to start tracking welder continuity.</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontFamily: '-apple-system, system-ui, sans-serif' }}>
            Required by AWS D1.1 Clause 7 and AISC 207-23 for all AISC-certified fabricators.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="chem-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th><th>Stamp</th><th>Process</th><th>Position</th>
                <th>Qualified</th><th>Last Weld</th><th>Expiry</th><th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {welders.map(w => {
                const st = calculateStatus(w.lastWeldDate);
                return (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.stamp}</td>
                    <td>{w.process}</td>
                    <td>{w.position}</td>
                    <td>{w.qualificationDate || '—'}</td>
                    <td>{w.lastWeldDate || '—'}</td>
                    <td>{w.lastWeldDate ? new Date(new Date(w.lastWeldDate).setMonth(new Date(w.lastWeldDate).getMonth() + 6)).toLocaleDateString() : '—'}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, color: st.color, background: st.color + '15', border: `1px solid ${st.color}30` }}>
                        {st.status}{st.daysRemaining > 0 ? ` (${st.daysRemaining}d)` : ''}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => handleEdit(w)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(w.id)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #c0392b30', borderRadius: 4, background: 'rgba(192,57,43,0.05)', color: '#c0392b', cursor: 'pointer', marginLeft: 4 }}>Del</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: '-apple-system, system-ui, sans-serif',
  background: 'var(--card)',
  marginTop: 4,
  boxSizing: 'border-box',
};
