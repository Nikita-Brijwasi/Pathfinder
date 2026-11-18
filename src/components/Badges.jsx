import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Award, Download, Calendar, BookOpen, Shield, Trophy, Sparkles, Map } from 'lucide-react';
import { Certificate } from './Certificate';

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
};

const BadgeCard = ({ track, onViewCert, onViewRoadmap, index }) => {
  const difficultyColor = track.difficulty === 'Advanced' ? 'var(--danger)'
    : track.difficulty === 'Intermediate' ? 'var(--primary)'
    : 'var(--accent)';

  return (
    <motion.div
      className="badge-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="badge-medal">
        <div className="badge-medal-ring">
          <Trophy size={36} />
        </div>
        <div className="badge-medal-ribbon" />
      </div>

      <div className="badge-card-body">
        <div className="badge-card-eyebrow">
          <Sparkles size={12} /> Completed
        </div>
        <h3 className="badge-card-title">{track.title}</h3>
        <p className="badge-card-desc">{track.description}</p>

        <div className="badge-card-meta">
          <span><Calendar size={14} /> {formatDate(track.completedAt || track.updatedAt)}</span>
          <span><BookOpen size={14} /> {track.nodes?.length || 0} modules</span>
          <span style={{ color: difficultyColor }}>
            <Shield size={14} /> {track.difficulty || 'Intermediate'}
          </span>
        </div>
      </div>

      <div className="badge-card-actions">
        {onViewRoadmap && (
          <button className="btn btn-secondary" onClick={() => onViewRoadmap(track)}>
            <Map size={16} /> View Roadmap
          </button>
        )}
        <button className="btn btn-primary" onClick={() => onViewCert(track)}>
          <Download size={16} /> Certificate
        </button>
      </div>
    </motion.div>
  );
};

export const Badges = ({ user, tracks, onBack, onViewRoadmap }) => {
  const [activeTrack, setActiveTrack] = useState(null);

  const completed = (tracks || [])
    .filter(t => t.progress === 100)
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0));

  const handleOpen = (track) => setActiveTrack(track);
  const handleClose = () => setActiveTrack(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 0.75rem' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="section-title" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', margin: 0 }}>
            Your Badges
          </h1>
        </div>
        <div className="badges-count-pill">
          <Award size={16} color="var(--primary)" />
          <span>{completed.length} earned</span>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '640px' }}>
        Every completed roadmap earns you a badge and a verifiable certificate. Download the PDF
        to share your achievement.
      </p>

      {completed.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
          <Trophy size={56} style={{ opacity: 0.25, margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No badges yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Finish a learning track to unlock your first achievement badge and certificate.
          </p>
        </div>
      ) : (
        <div className="badge-grid">
          {completed.map((track, i) => (
            <BadgeCard
              key={track.id}
              track={track}
              index={i}
              onViewCert={handleOpen}
              onViewRoadmap={onViewRoadmap}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeTrack && (
          <Certificate user={user} track={activeTrack} onClose={handleClose} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
