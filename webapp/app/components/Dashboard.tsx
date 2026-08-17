'use client';

import { useState, useEffect } from 'react';

export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: string;
  status?: string;
  badgeColor?: string;
}

const CONFIDENTIALITY_NOTICE = `CONFIDENTIAL — This system contains proprietary fabrication data including MTRs, structural drawings, QC reports, welder qualifications, and calibration records. All data is stored locally in your browser and is never shared, transmitted, or accessible to third parties. Unauthorized access, copying, or distribution of this information is prohibited.`;

export default function Dashboard({ onSelectTool }: { onSelectTool: (tool: string) => void }) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const ack = sessionStorage.getItem('qc_confidentiality_acked');
    if (ack === 'true') setAccepted(true);
  }, []);

  const handleAccept = () => {
    sessionStorage.setItem('qc_confidentiality_acked', 'true');
    setAccepted(true);
  };

  const tools: Tool[] = [
    {
      id: 'mtr',
      title: 'MTR Verification',
      description: 'Upload Material Test Reports. Auto-extract heats, chemistry, specs. Verify against AWS D1.1/D1.5, ASME, API codes. Stamp approved MTRs.',
      icon: '📋',
      status: 'Active',
      badgeColor: '#2d7a3e',
    },
    {
      id: 'drawing',
      title: 'Drawing Inspection & QC Reports',
      description: 'Upload structural drawings. Extract dimensions, materials, weld specs. Generate filled QC report templates for Pre-Fab, Assembly, and Finishing inspection.',
      icon: '📐',
      status: 'Active',
      badgeColor: '#2d7a3e',
    },
    {
      id: 'welder',
      title: 'Welder Continuity Log',
      description: 'Track welder qualifications, continuity periods (AWS 6-month rule), processes, positions, and essential variables. Flag welders approaching expiry.',
      icon: '🔧',
      status: 'AISC Required',
      badgeColor: '#c45a2d',
    },
    {
      id: 'calibration',
      title: 'Calibration Records',
      description: 'Track measuring and testing equipment calibration. Monitor due dates, NIST traceability, and calibration intervals. Flag overdue equipment.',
      icon: '📏',
      status: 'AISC Required',
      badgeColor: '#c45a2d',
    },
    {
      id: 'incidents',
      title: 'Quality Incident Reports',
      description: 'Log nonconformances and quality incidents. Track root cause, corrective action, resolution status, and disposition per AISC 207-23 requirements.',
      icon: '⚠',
      status: 'AISC Required',
      badgeColor: '#c45a2d',
    },
    {
      id: 'aisc',
      title: 'AISC Compliance Dashboard',
      description: 'Overview of all AISC 207-23 certification requirements. Material control, welder quals, WPS/PQR, calibration, NDT records, final inspection, audit trail.',
      icon: '🏛',
      status: 'Compliance',
      badgeColor: '#1a4a7a',
    },
  ];

  if (!accepted) {
    return (
      <div style={{ maxWidth: 700, margin: '60px auto' }}>
        <div style={{
          padding: 40,
          border: '2px solid #c45a2d',
          borderRadius: 8,
          background: 'rgba(196, 90, 45, 0.03)',
        }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 16, color: '#c45a2d' }}>
            ⚠ Confidentiality Notice
          </h2>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.7, color: 'var(--text)', marginBottom: 24 }}>
            {CONFIDENTIALITY_NOTICE}
          </p>
          <div style={{
            padding: 16,
            background: 'rgba(45, 122, 62, 0.05)',
            borderRadius: 6,
            border: '1px solid rgba(45, 122, 62, 0.15)',
            marginBottom: 24,
          }}>
            <h4 style={{ fontSize: 13, fontFamily: '-apple-system, system-ui, sans-serif', marginBottom: 8, color: '#2d7a3e' }}>
              Data Security
            </h4>
            <ul style={{ fontSize: 12, fontFamily: '-apple-system, system-ui, sans-serif', paddingLeft: 20, lineHeight: 1.6, color: 'var(--text)' }}>
              <li>All documents are processed in-memory and are not stored on any server</li>
              <li>QC records, welder logs, and calibration data are stored locally in your browser only</li>
              <li>No data is transmitted to third parties or shared between users</li>
              <li>Drawings and MTRs are sent only to OpenAI GPT-4o for extraction and immediately discarded</li>
              <li>Your proprietary fabrication data remains yours — always</li>
            </ul>
          </div>
          <button
            onClick={handleAccept}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: 14,
              fontFamily: '-apple-system, system-ui, sans-serif',
              fontWeight: 600,
              background: '#2d7a3e',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            I Understand — Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, marginBottom: 8 }}>Q.C. Quality Console</h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>
          AISC 207-23 Compliant Quality Management System
        </p>
      </div>

      {/* Confidentiality Bar */}
      <div style={{
        padding: '10px 20px',
        background: 'rgba(196, 90, 45, 0.04)',
        borderRadius: 6,
        border: '1px solid rgba(196, 90, 45, 0.12)',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 12, color: '#c45a2d', fontWeight: 600, fontFamily: '-apple-system, system-ui, sans-serif' }}>🔒 CONFIDENTIAL</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
          All data is stored locally in your browser. No information is shared or transmitted to third parties.
        </span>
      </div>

      {/* Tool Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20,
      }}>
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            style={{
              padding: 24,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 28 }}>{tool.icon}</span>
              {tool.status && (
                <span style={{
                  fontSize: 10,
                  fontFamily: '-apple-system, system-ui, sans-serif',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 4,
                  background: (tool.badgeColor || '#888') + '15',
                  color: tool.badgeColor || '#888',
                  border: `1px solid ${(tool.badgeColor || '#888')}30`,
                }}>
                  {tool.status}
                </span>
              )}
            </div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 17, margin: 0 }}>{tool.title}</h3>
            <p style={{ fontSize: 12, fontFamily: '-apple-system, system-ui, sans-serif', color: 'var(--muted)', lineHeight: 1.6, margin: 0, flex: 1 }}>
              {tool.description}
            </p>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: '-apple-system, system-ui, sans-serif', fontWeight: 600 }}>
              Open →
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 40, padding: 20, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          Q.C. Quality Console · Built for AISC-Certified Steel Fabricators · AWS D1.1 / D1.5 / ASME / API Compliant
        </p>
      </div>
    </div>
  );
}
