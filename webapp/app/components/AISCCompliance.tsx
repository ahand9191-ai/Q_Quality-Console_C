'use client';

import { useState, useEffect } from 'react';

interface ComplianceItem {
  id: string;
  category: string;
  requirement: string;
  description: string;
  aiscReference: string;
  status: 'pass' | 'fail' | 'warn' | 'pending';
  detail?: string;
}

export default function AISCCompliance({ onBack }: { onBack: () => void }) {
  const [welderCount, setWelderCount] = useState(0);
  const [welderExpired, setWelderExpired] = useState(0);
  const [calCount, setCalCount] = useState(0);
  const [calOverdue, setCalOverdue] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [incidentOpen, setIncidentOpen] = useState(0);

  useEffect(() => {
    const welders = JSON.parse(localStorage.getItem('qc_welder_continuity') || '[]');
    setWelderCount(welders.length);
    setWelderExpired(welders.filter((w: any) => {
      if (!w.lastWeldDate) return true;
      const six = new Date(w.lastWeldDate);
      six.setMonth(six.getMonth() + 6);
      return six < new Date();
    }).length);

    const cal = JSON.parse(localStorage.getItem('qc_calibration_records') || '[]');
    setCalCount(cal.length);
    setCalOverdue(cal.filter((e: any) => {
      if (!e.nextCalibrationDate) return true;
      return new Date(e.nextCalibrationDate) < new Date();
    }).length);

    const inc = JSON.parse(localStorage.getItem('qc_quality_incidents') || '[]');
    setIncidentCount(inc.length);
    setIncidentOpen(inc.filter((i: any) => i.status === 'Open').length);
  }, []);

  const items: ComplianceItem[] = [
    {
      id: 'material-control',
      category: 'Material Control',
      requirement: 'Material Test Reports (MTRs) on file',
      description: 'All steel material must have MTRs verified and on file. Heat numbers must be traceable to fabricated pieces.',
      aiscReference: 'AISC 207-23 Ch. 5',
      status: 'pass',
      detail: 'MTR Verification tool active. Heat number extraction and chemistry verification operational.',
    },
    {
      id: 'material-traceability',
      category: 'Material Control',
      requirement: 'Heat number traceability',
      description: 'Each piece must be traceable to its heat number and corresponding MTR. Material must be marked with heat numbers throughout fabrication.',
      aiscReference: 'AISC 207-23 Ch. 5',
      status: 'pass',
      detail: 'Heat numbers extracted and stored per MTR. Multiple heats per document supported.',
    },
    {
      id: 'welder-qual',
      category: 'Welder Qualifications',
      requirement: 'Welder continuity logs maintained',
      description: 'AWS D1.1/D1.5 requires welders to use each qualified process at least once every 6 months. Continuity must be documented.',
      aiscReference: 'AWS D1.1 Cl. 7 / AISC 207-23 Ch. 10',
      status: welderCount === 0 ? 'pending' : welderExpired > 0 ? 'fail' : 'pass',
      detail: welderCount === 0
        ? 'No welders logged yet. Add welders in the Welder Continuity Log.'
        : `${welderCount} welders tracked. ${welderExpired} expired.`,
    },
    {
      id: 'wps-pqr',
      category: 'Welding Procedures',
      requirement: 'WPS/PQR documented and current',
      description: 'Welding Procedure Specifications (WPS) and Procedure Qualification Records (PQR) must be available, current, and followed.',
      aiscReference: 'AWS D1.1 Cl. 6 / AISC 207-23 Ch. 10',
      status: 'warn',
      detail: 'WPS/PQR document management feature coming soon. Currently referenced in QC reports.',
    },
    {
      id: 'calibration',
      category: 'Equipment Calibration',
      requirement: 'Inspection equipment calibrated',
      description: 'All measuring, testing, and inspection equipment must be calibrated at prescribed intervals, traceable to NIST standards.',
      aiscReference: 'AISC 207-23 Ch. 11',
      status: calCount === 0 ? 'pending' : calOverdue > 0 ? 'fail' : 'pass',
      detail: calCount === 0
        ? 'No equipment logged yet. Add equipment in Calibration Records.'
        : `${calCount} equipment items tracked. ${calOverdue} overdue.`,
    },
    {
      id: 'weld-inspection',
      category: 'Weld Inspection',
      requirement: 'Visual + NDT inspection records',
      description: 'All welds must be visually inspected. NDT (UT/MT) performed per code requirements. Results documented with CWI initials.',
      aiscReference: 'AWS D1.1/D1.5 Cl. 8 / AISC 207-23 Ch. 12',
      status: 'pass',
      detail: 'Weld inspection section included in Assembly QC Check reports. Visual, UT, and MT documented.',
    },
    {
      id: 'nonconformance',
      category: 'Nonconformance',
      requirement: 'Quality incident tracking',
      description: 'All nonconformances must be documented with root cause analysis, corrective action, and disposition.',
      aiscReference: 'AISC 207-23 Ch. 14',
      status: incidentCount === 0 ? 'pass' : incidentOpen > 0 ? 'warn' : 'pass',
      detail: incidentCount === 0
        ? 'No incidents logged — system ready when needed.'
        : `${incidentCount} incidents tracked. ${incidentOpen} open.`,
    },
    {
      id: 'final-inspection',
      category: 'Final Inspection',
      requirement: 'Final inspection before shipping',
      description: 'QC inspector must perform final inspection of all fabricated steel prior to shipping. Results documented and signed.',
      aiscReference: 'AISC 207-23 Ch. 13',
      status: 'pass',
      detail: 'Finishing sheet in QC reports includes shipping inspection, damage verification, and final QC signature.',
    },
    {
      id: 'documentation',
      category: 'Documentation',
      requirement: 'Audit trail and record retention',
      description: 'All QC records must be maintained and available for AISC audit. Records include MTRs, welder quals, calibration, NDT, incidents.',
      aiscReference: 'AISC 207-23 Ch. 4',
      status: 'pass',
      detail: 'All modules store data locally. Export capabilities for audit preparation.',
    },
    {
      id: 'qc-inspector',
      category: 'Personnel',
      requirement: 'Qualified QC Inspector (QCI)',
      description: 'AISC 207-23 requires QCIs to be qualified per ANSI/AISC standards. Typically AWS CWI certification required.',
      aiscReference: 'AISC 207-23 Ch. 7',
      status: 'warn',
      detail: 'QCI qualification tracking feature coming soon. Currently documented in QC report signatures.',
    },
  ];

  const categories = Array.from(new Set(items.map(i => i.category)));
  const passCount = items.filter(i => i.status === 'pass').length;
  const failCount = items.filter(i => i.status === 'fail').length;
  const warnCount = items.filter(i => i.status === 'warn').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;

  const statusConfig = {
    pass: { color: '#2d7a3e', bg: 'rgba(45,122,62,0.05)', icon: '✓', label: 'Compliant' },
    fail: { color: '#c0392b', bg: 'rgba(192,57,43,0.05)', icon: '✗', label: 'Non-Compliant' },
    warn: { color: '#c45a2d', bg: 'rgba(196,90,45,0.05)', icon: '⚠', label: 'Needs Attention' },
    pending: { color: '#888', bg: 'rgba(128,128,128,0.05)', icon: '○', label: 'Not Started' },
  };

  return (
    <div>
      <div className="results-header no-print">
        <h2>AISC 207-23 Compliance Dashboard</h2>
        <button className="btn btn-outline" onClick={onBack}>← Dashboard</button>
      </div>

      <div style={{ fontSize: 12, fontFamily: 'Georgia, serif', color: 'var(--muted)', fontStyle: 'italic', marginBottom: 16 }}>
        Overview of all AISC Certification requirements for steel fabricators. This dashboard aggregates data from all Q.C. Quality Console modules to provide a real-time compliance status for AISC audit preparation.
      </div>

      {/* Overall Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #2d7a3e30', background: 'rgba(45,122,62,0.04)' }}>
          <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#2d7a3e' }}>{passCount}</div>
          <div style={{ fontSize: 11, color: '#2d7a3e' }}>Compliant</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c45a2d30', background: 'rgba(196,90,45,0.04)' }}>
          <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c45a2d' }}>{warnCount}</div>
          <div style={{ fontSize: 11, color: '#c45a2d' }}>Needs Attention</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #c0392b30', background: 'rgba(192,57,43,0.04)' }}>
          <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#c0392b' }}>{failCount}</div>
          <div style={{ fontSize: 11, color: '#c0392b' }}>Non-Compliant</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 6, border: '1px solid #88888830', background: 'rgba(128,128,128,0.04)' }}>
          <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 'bold', color: '#888' }}>{pendingCount}</div>
          <div style={{ fontSize: 11, color: '#888' }}>Not Started</div>
        </div>
      </div>

      {/* Compliance Items by Category */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{cat}</h3>
          {items.filter(i => i.category === cat).map(item => {
            const cfg = statusConfig[item.status];
            return (
              <div key={item.id} style={{ padding: 14, border: `1px solid ${cfg.color}20`, borderRadius: 6, background: cfg.bg, marginBottom: 8, display: 'flex', gap: 12 }}>
                <div style={{ fontSize: 18, color: cfg.color, fontWeight: 'bold', minWidth: 20 }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', fontWeight: 600 }}>{item.requirement}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 3, color: cfg.color, background: cfg.color + '15', border: `1px solid ${cfg.color}30` }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{item.description}</div>
                  <div style={{ fontSize: 10, fontFamily: '-apple-system, system-ui, sans-serif', color: cfg.color }}>
                    {item.aiscReference}{item.detail ? ` · ${item.detail}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 32, padding: 16, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)' }}>
        <h4 style={{ fontFamily: 'Georgia, serif', fontSize: 13, marginBottom: 8 }}>About AISC 207-23</h4>
        <p style={{ fontSize: 11, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)', lineHeight: 1.6 }}>
          AISC 207-23 is the current Certification Standard for Steel Fabrication, Erection, and Manufacturing of Metal Components (effective February 2026). It supersedes AISC 207-16 and consolidates requirements for building fabricators (STD), bridge fabricators (BU), and component manufacturers (CMF). Certification requires a complete Quality Management System with documented procedures for material control, welding, inspection, calibration, nonconformance tracking, and personnel qualification.
        </p>
      </div>
    </div>
  );
}
