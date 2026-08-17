'use client';

import { useState, useEffect } from 'react';

interface Equipment {
  id: string;
  name: string;
  assetId: string;
  type: string;
  serialNumber: string;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  interval: number; // months
  calibratedBy: string;
  standard: string; // NIST traceable
  certificateNumber: string;
  notes: string;
}

const STORAGE_KEY = 'qc_calibration_records';

const EQUIPMENT_TYPES = [
  'Torque Wrench',
  'Measuring Tape',
  'Caliper',
  'Micrometer',
  'Square',
  'Level',
  'UT Thickness Gauge',
  'UT Flaw Detector',
  'MT Yoke',
  'P hardness Tester',
  'Thermometer',
  'Hydrostatic Pump',
  'Other',
];

function calculateStatus(nextCal: string): { status: string; daysRemaining: number; color: string } {
  if (!nextCal) return { status: 'No Due Date', daysRemaining: 0, color: '#888' };
  const due = new Date(nextCal);
  const now = new Date();
  const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return { status: 'OVERDUE', daysRemaining, color: '#c0392b' };
  if (daysRemaining <= 30) return { status: 'Due Soon', daysRemaining, color: '#c45a2d' };
  return { status: 'Current', daysRemaining, color: '#2d7a3e' };
}

export default function CalibrationRecords({ onBack }: { onBack: () => void }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Equipment>({
    id: '', name: '', assetId: '', type: 'Torque Wrench', serialNumber: '',
    lastCalibrationDate: '', nextCalibrationDate: '', interval: 12, calibratedBy: '',
    standard: 'NIST Traceable', certificateNumber: '', notes: '',
  });

  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) setEquipment(JSON.parse(data));
  }, []);

  const save = (list: Equipment[]) => {
    setEquipment(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.name || !form.assetId) return;
    // Auto-calculate next calibration date
    let nextCal = form.nextCalibrationDate;
    if (form.lastCalibrationDate && form.interval) {
      const d = new Date(form.lastCalibrationDate);
      d.setMonth(d.getMonth() + form.interval);
      nextCal = d.toISOString().split('T')[0];
    }
    const item = { ...form, nextCalibrationDate: nextCal };
    if (editId) {
      save(equipment.map(e => e.id === editId ? item : e));
    } else {
      save([...equipment, { ...item, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = (id: string) => save(equipment.filter(e => e.id !== id));

  const currentCount = equipment.filter(e => calculateStatus(e.nextCalibrationDate).status === 'Current').length;
  const overdueCount = equipment.filter(e => calculateStatus(e.nextCalibrationDate).status === 'OVERDUE').length;
  const dueSoonCount = equipment.filter(e => calculateStatus(e.nextCalibrationDate).status === 'Due Soon').length;

  return (
    <div>
      <div className="results-header no-print">
        <h2>Calibration Records</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={onBack}>← Dashboard</button>
          <button className="btn" onClick={() => { setShowForm(true); setEditId(null); setForm({ id: '', name: '', assetId: '', type: 'Torque Wrench', serialNumber: '', lastCalibrationDate: '', nextCalibrationDate: '', interval: 12, calibratedBy: '', standard: 'NIST Traceable', certificateNumber: '', notes: '' }); }}>+ Add Equipment</button>
        </div>
      </div>

      <div style={{ fontSize: 12, fontFamily: 'Georgia, serif', color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
        AISC 207-23 requires all measuring and testing equipment used for inspection to be calibrated at prescribed intervals, traceable to national standards (NIST), and documented. This includes torque wrenches, measuring devices, UT/MT equipment, and hardness testers.
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>{equipment.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>Total Equipment</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #2d7a3e30', background: 'rgba(45,122,62,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#2d7a3e' }}>{currentCount}</div>
          <div style={{ fontSize: 11, color: '#2d7a3e', fontFamily: '-apple-system, system-ui, sans-serif' }}>Current</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c45a2d30', background: 'rgba(196,90,45,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c45a2d' }}>{dueSoonCount}</div>
          <div style={{ fontSize: 11, color: '#c45a2d', fontFamily: '-apple-system, system-ui, sans-serif' }}>Due ≤30d</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c0392b30', background: 'rgba(192,57,43,0.04)' }}>
          <div style={{ fontSize: 24, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c0392b' }}>{overdueCount}</div>
          <div style={{ fontSize: 11, color: '#c0392b', fontFamily: '-apple-system, system-ui, sans-serif' }}>Overdue</div>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, marginBottom: 16 }}>{editId ? 'Edit Equipment' : 'Add Equipment'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div><label style={labelStyle}>Equipment Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Snap-On Torque Wrench" /></div>
            <div><label style={labelStyle}>Asset ID *</label><input style={inputStyle} value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} placeholder="CAL-001" /></div>
            <div><label style={labelStyle}>Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label style={labelStyle}>Serial Number</label><input style={inputStyle} value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div>
            <div><label style={labelStyle}>Last Calibration Date</label><input type="date" style={inputStyle} value={form.lastCalibrationDate} onChange={e => setForm({ ...form, lastCalibrationDate: e.target.value })} /></div>
            <div><label style={labelStyle}>Interval (months)</label><input type="number" style={inputStyle} value={form.interval} onChange={e => setForm({ ...form, interval: parseInt(e.target.value) || 12 })} /></div>
            <div><label style={labelStyle}>Calibrated By</label><input style={inputStyle} value={form.calibratedBy} onChange={e => setForm({ ...form, calibratedBy: e.target.value })} placeholder="QC Dept / External Lab" /></div>
            <div><label style={labelStyle}>Standard</label><input style={inputStyle} value={form.standard} onChange={e => setForm({ ...form, standard: e.target.value })} /></div>
            <div><label style={labelStyle}>Certificate #</label><input style={inputStyle} value={form.certificateNumber} onChange={e => setForm({ ...form, certificateNumber: e.target.value })} /></div>
            <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Range, tolerance, any limitations" /></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleSubmit} style={{ fontSize: 13 }}>{editId ? 'Update' : 'Add Equipment'}</button>
            <button className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <div className="saas-note" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>No equipment logged yet. Click "+ Add Equipment" to start tracking calibrations.</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontFamily: '-apple-system, system-ui, sans-serif' }}>
            Required by AISC 207-23 for all inspection, measuring, and testing equipment.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="chem-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Equipment</th><th>Asset ID</th><th>Type</th>
                <th>Last Cal</th><th>Next Cal</th><th>Interval</th>
                <th>Cal By</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {equipment.map(e => {
                const st = calculateStatus(e.nextCalibrationDate);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.assetId}</td>
                    <td>{e.type}</td>
                    <td>{e.lastCalibrationDate || '—'}</td>
                    <td>{e.nextCalibrationDate || '—'}</td>
                    <td>{e.interval} mo</td>
                    <td>{e.calibratedBy || '—'}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, color: st.color, background: st.color + '15', border: `1px solid ${st.color}30` }}>
                        {st.status}{st.daysRemaining > 0 ? ` (${st.daysRemaining}d)` : ''}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => { setForm(e); setEditId(e.id); setShowForm(true); }} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card)', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(e.id)} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #c0392b30', borderRadius: 4, background: 'rgba(192,57,43,0.05)', color: '#c0392b', cursor: 'pointer', marginLeft: 4 }}>Del</button>
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

const labelStyle: React.CSSProperties = { fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4,
  fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', background: 'var(--card)', marginTop: 4, boxSizing: 'border-box',
};
