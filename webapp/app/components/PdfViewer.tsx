'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface HighlightMatch {
  text: string;
  type: 'heat' | 'spec' | 'grade' | 'shape' | 'origin' | 'compliance' | 'cvn' | 'chem';
}

interface StampConfig {
  name: string;
  title: string;
  company: string;
  color: 'green' | 'blue' | 'red' | 'black';
  shape: 'circular' | 'rectangular';
}

interface PdfViewerProps {
  file: File;
  highlights: string[];
  stamp: StampConfig | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function PdfViewer({ file, highlights, stamp, onApprove, onReject }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageTextItems, setPageTextItems] = useState<any[]>([]);
  const [stampPos, setStampPos] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [approved, setApproved] = useState(false);

  const stampColors: Record<string, string> = {
    green: '#22a722',
    blue: '#2266cc',
    red: '#cc2222',
    black: '#333333',
  };

  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        setNumPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current!;
        const overlay = overlayRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        overlay.width = viewport.width;
        overlay.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        overlay.style.width = '100%';
        overlay.style.height = 'auto';

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const textContent = await page.getTextContent();
        setPageTextItems(textContent.items as any[]);

        drawHighlights(textContent.items as any[], viewport, overlay);
      } catch (e) {
        console.error('PDF load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [file, currentPage]);

  const drawHighlights = (items: any[], viewport: any, overlay: HTMLCanvasElement) => {
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const highlightSet = new Set(highlights.filter(h => h && h.length > 2).map(h => h.toUpperCase()));

    for (const item of items) {
      if (!item.str || item.str.trim().length < 1) continue;
      const text = item.str.toUpperCase().trim();

      let matched = false;
      for (const hl of highlightSet) {
        if (text.includes(hl) || hl.includes(text)) {
          if (text.length >= 2 && hl.length >= 2) {
            matched = true;
            break;
          }
        }
      }

      if (!matched) continue;

      const tx = item.transform;
      const x = tx[4];
      const y = viewport.height - tx[5];
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
      const width = item.width || (text.length * fontHeight * 0.5);

      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.fillRect(x - 1, y - fontHeight - 1, width + 2, fontHeight + 2);

      ctx.strokeStyle = 'rgba(255, 193, 7, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 1, y - fontHeight - 1, width + 2, fontHeight + 2);
    }
  };

  useEffect(() => {
    if (pageTextItems.length > 0 && overlayRef.current && canvasRef.current) {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      drawHighlights(pageTextItems, { width: canvas.width, height: canvas.height } as any, overlay);
    }
  }, [highlights, pageTextItems]);

  const handleStampDrag = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setStampPos({ x: Math.max(5, Math.min(85, x)), y: Math.max(5, Math.min(85, y)) });
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontFamily: 'Georgia, serif' }}>Original MTR Document</h3>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: '-apple-system, system-ui, sans-serif' }}>
          Highlighted fields from extraction scan · Drag stamp to position
        </span>
        {numPages > 1 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, fontFamily: 'Georgia, serif' }}>Page {currentPage} / {numPages}</span>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}
        onMouseMove={handleStampDrag}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        {loading && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            Loading PDF...
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: loading ? 'none' : 'block', width: '100%' }} />
        <canvas
          ref={overlayRef}
          style={{
            display: loading ? 'none' : 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Stamp overlay */}
        {stamp && approved && (
          <div
            onMouseDown={() => setDragging(true)}
            style={{
              position: 'absolute',
              left: `${stampPos.x}%`,
              top: `${stampPos.y}%`,
              cursor: 'move',
              transform: 'rotate(-12deg)',
              userSelect: 'none',
              opacity: 0.85,
              zIndex: 10,
            }}
          >
            {stamp.shape === 'circular' ? (
              <div style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                border: `3px solid ${stampColors[stamp.color]}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 12,
                boxSizing: 'border-box',
                background: `${stampColors[stamp.color]}08`,
              }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: stampColors[stamp.color], fontFamily: 'Georgia, serif' }}>APPROVED</div>
                <div style={{ fontSize: 9, color: stampColors[stamp.color], marginTop: 2, fontFamily: '-apple-system, sans-serif' }}>{stamp.name}</div>
                {stamp.title && <div style={{ fontSize: 7, color: stampColors[stamp.color], marginTop: 1 }}>{stamp.title}</div>}
                <div style={{ fontSize: 8, color: stampColors[stamp.color], marginTop: 4 }}>{today}</div>
                {stamp.company && <div style={{ fontSize: 7, color: stampColors[stamp.color], marginTop: 1 }}>{stamp.company}</div>}
              </div>
            ) : (
              <div style={{
                border: `3px solid ${stampColors[stamp.color]}`,
                borderRadius: 4,
                padding: '10px 20px',
                textAlign: 'center',
                background: `${stampColors[stamp.color]}08`,
                minWidth: 160,
              }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: stampColors[stamp.color], fontFamily: 'Georgia, serif' }}>APPROVED</div>
                <div style={{ fontSize: 10, color: stampColors[stamp.color], marginTop: 2, fontFamily: '-apple-system, sans-serif' }}>{stamp.name}</div>
                {stamp.title && <div style={{ fontSize: 8, color: stampColors[stamp.color] }}>{stamp.title}</div>}
                <div style={{ fontSize: 9, color: stampColors[stamp.color], marginTop: 3 }}>{today}</div>
                {stamp.company && <div style={{ fontSize: 8, color: stampColors[stamp.color] }}>{stamp.company}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
          {!approved ? (
            <>
              <button
                className="btn"
                style={{ background: '#22a722', borderColor: '#1a8a1a', padding: '10px 28px', fontSize: 14 }}
                onClick={() => { setApproved(true); onApprove(); }}
              >
                ✓ Approve & Apply Stamp
              </button>
              <button
                className="btn"
                style={{ background: '#cc2222', borderColor: '#aa1818', padding: '10px 28px', fontSize: 14 }}
                onClick={onReject}
              >
                ✗ Reject
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 20px', background: 'rgba(34,167,34,0.1)', borderRadius: 6, border: '1px solid rgba(34,167,34,0.3)' }}>
              <span style={{ color: '#22a722', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>✓ MTR Approved — Stamp applied. Drag to reposition.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
