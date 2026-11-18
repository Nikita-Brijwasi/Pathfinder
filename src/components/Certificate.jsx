import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Download, X, Award, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
};

const certificateId = (uid, trackId) => {
  // Short deterministic ID for the certificate footer (looks official)
  const seed = `${uid || 'anon'}-${trackId || 'track'}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `PF-${h.toString(16).toUpperCase().padStart(8, '0')}`;
};

export const Certificate = ({ user, track, onClose }) => {
  const sheetRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const recipientName = user?.displayName || user?.email?.split('@')[0] || 'Learner';
  const completedDate = formatDate(track?.completedAt || track?.updatedAt || Date.now());
  const certId = certificateId(user?.uid, track?.id);

  const handleDownload = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      // A4 landscape: 297 x 210mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // Fit image preserving aspect ratio
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = pageW / pageH;
      let w = pageW, h = pageH;
      if (imgRatio > pageRatio) h = pageW / imgRatio;
      else w = pageH * imgRatio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      const safeTitle = (track?.title || 'certificate').replace(/[^\w\-]+/g, '_').slice(0, 40);
      pdf.save(`PathFinder_${safeTitle}_Certificate.pdf`);
    } catch (e) {
      console.error('Certificate export failed:', e);
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay cert-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cert-modal"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cert-toolbar">
          <div className="cert-toolbar-title">
            <Award size={18} color="var(--primary)" />
            <span>Certificate Preview</span>
          </div>
          <div className="cert-toolbar-actions">
            <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
              <Download size={16} /> {downloading ? 'Generating…' : 'Download PDF'}
            </button>
            <button className="btn btn-secondary cert-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="cert-scroll">
          {/* Fixed-size sheet — html2canvas renders this exact element to PDF */}
          <div ref={sheetRef} className="cert-sheet" aria-label="Certificate of Completion">
            <div className="cert-bg-glow cert-bg-glow-a" />
            <div className="cert-bg-glow cert-bg-glow-b" />
            <div className="cert-border">
              <div className="cert-corner cert-corner-tl" />
              <div className="cert-corner cert-corner-tr" />
              <div className="cert-corner cert-corner-bl" />
              <div className="cert-corner cert-corner-br" />

              <div className="cert-brandbar">
                <BrainCircuit size={32} />
                <span className="cert-brand-word">PathFinder AI</span>
              </div>

              <div className="cert-eyebrow">
                <Sparkles size={14} /> Certificate of Completion <Sparkles size={14} />
              </div>

              <div className="cert-presented">This certificate is proudly presented to</div>

              <div className="cert-name">{recipientName}</div>

              <div className="cert-divider" />

              <div className="cert-body">
                for successfully completing the learning track
              </div>

              <div className="cert-track">"{track?.title || 'Untitled Track'}"</div>

              {track?.description ? (
                <div className="cert-desc">{track.description}</div>
              ) : null}

              <div className="cert-meta-row">
                <div className="cert-meta-block">
                  <div className="cert-meta-label">Date</div>
                  <div className="cert-meta-value">{completedDate}</div>
                </div>
                <div className="cert-meta-block">
                  <div className="cert-meta-label">Level</div>
                  <div className="cert-meta-value">{track?.difficulty || 'Intermediate'}</div>
                </div>
                <div className="cert-meta-block">
                  <div className="cert-meta-label">Modules</div>
                  <div className="cert-meta-value">{track?.nodes?.length || 0}</div>
                </div>
                <div className="cert-meta-block">
                  <div className="cert-meta-label">Est. Hours</div>
                  <div className="cert-meta-value">{track?.estimatedTotalHours || '—'}</div>
                </div>
              </div>

              <div className="cert-footer">
                <div className="cert-sig">
                  <div className="cert-sig-line" />
                  <div className="cert-sig-label">The Architect</div>
                  <div className="cert-sig-sub">PathFinder AI</div>
                </div>
                <div className="cert-seal">
                  <div className="cert-seal-ring">
                    <BrainCircuit size={28} />
                  </div>
                  <div className="cert-seal-label">Verified</div>
                </div>
                <div className="cert-sig">
                  <div className="cert-sig-line" />
                  <div className="cert-sig-label">Certificate ID</div>
                  <div className="cert-sig-sub">{certId}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
