import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, X, Trophy } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Collect every flashcard across every completed node in every track,
// stamping each card with the trackId / nodeId so we can save reviews back.
const collectDueCards = (tracks, maxCards = 5) => {
  const now = Date.now();
  const pool = [];
  (tracks || []).forEach(track => {
    (track.nodes || []).forEach(node => {
      if (!Array.isArray(node.flashcards)) return;
      node.flashcards.forEach((card, idx) => {
        const due = (card.dueAt ?? card.createdAt ?? now);
        const overdueBy = now - due;
        pool.push({
          card,
          cardIndex: idx,
          trackId: track.id,
          trackTitle: track.title,
          nodeId: node.id,
          nodeTitle: node.title,
          // Higher score = higher priority. Never-reviewed cards win first.
          score: (card.reviewCount === 0 ? 1e12 : 0) + Math.max(0, overdueBy),
        });
      });
    });
  });
  pool.sort((a, b) => b.score - a.score);
  return pool.slice(0, maxCards);
};

// Simple SM-2-ish spaced repetition update.
//   - "Got it" pushes the next review further out, bumps ease factor up.
//   - "Forgot" resets the interval to 1 day, drops ease factor down.
const reviewCard = (card, knewIt) => {
  const ease = Math.max(1.3, (card.easeFactor || 2.5) + (knewIt ? 0.1 : -0.2));
  const nextInterval = knewIt
    ? Math.max(1, Math.round((card.intervalDays || 1) * ease))
    : 1;
  return {
    ...card,
    lastReviewedAt: Date.now(),
    reviewCount: (card.reviewCount || 0) + 1,
    easeFactor: ease,
    intervalDays: nextInterval,
    dueAt: Date.now() + nextInterval * ONE_DAY_MS,
  };
};

export const TodaysRecall = ({ user, tracks }) => {
  const due = useMemo(() => collectDueCards(tracks, 5), [tracks]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState({}); // cardId -> knewIt boolean

  // Reset when the due-set changes (e.g., after a flashcard deck appears).
  useEffect(() => {
    setIdx(0);
    setFlipped(false);
    setReviewed({});
  }, [due.length, tracks?.length]);

  if (!user || !db) return null;
  if (!due || due.length === 0) {
    return (
      <div className="panel">
        <h3 style={{ marginBottom: '0.75rem' }}>
          <Brain size={18} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} /> Today's Recall
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Complete a lesson to unlock daily flashcards.
        </p>
      </div>
    );
  }

  const current = due[idx];
  const isDone = idx >= due.length;

  const saveReview = async (entry, updatedCard) => {
    try {
      // Find the track and rebuild its nodes array with the patched card.
      const track = (tracks || []).find(t => t.id === entry.trackId);
      if (!track) return;
      const newNodes = track.nodes.map(n => {
        if (n.id !== entry.nodeId) return n;
        const newCards = (n.flashcards || []).slice();
        newCards[entry.cardIndex] = updatedCard;
        return { ...n, flashcards: newCards };
      });
      await setDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', track.id),
        { nodes: newNodes, updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Recall] could not save review:', e?.message || e);
    }
  };

  const handleReview = (knewIt) => {
    if (!current) return;
    const updated = reviewCard(current.card, knewIt);
    setReviewed(prev => ({ ...prev, [current.card.id || `${current.trackId}_${current.nodeId}_${current.cardIndex}`]: knewIt }));
    // Save in the background; UI advances immediately.
    saveReview(current, updated);
    setFlipped(false);
    setIdx(i => i + 1);
  };

  const handleRestart = () => {
    setIdx(0);
    setFlipped(false);
    setReviewed({});
  };

  if (isDone) {
    const correct = Object.values(reviewed).filter(Boolean).length;
    return (
      <div className="panel">
        <h3 style={{ marginBottom: '0.75rem' }}>
          <Brain size={18} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} /> Today's Recall
        </h3>
        <div className="recall-summary">
          <Trophy size={36} color="var(--primary)" />
          <div className="recall-summary-score">{correct} / {due.length}</div>
          <p className="recall-summary-msg">
            {correct === due.length
              ? 'All clear today. See you tomorrow.'
              : correct >= Math.ceil(due.length * 0.7)
                ? 'Solid session. The ones you missed will resurface tomorrow.'
                : 'A few to review again — they will come back in the next session.'}
          </p>
          <button className="btn btn-secondary" onClick={handleRestart}>
            <RotateCcw size={14} /> Review again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>
          <Brain size={18} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} /> Today's Recall
        </h3>
        <span className="recall-counter">{idx + 1} / {due.length}</span>
      </div>
      <div className="recall-context">{current.trackTitle} &mdash; {current.nodeTitle}</div>

      <div
        className={`recall-card ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); } }}
      >
        <div className="recall-card-inner">
          <div className="recall-card-face front">
            <div className="recall-card-label">Question</div>
            <div className="recall-card-body">{current.card.front}</div>
            <div className="recall-card-hint">Click to reveal</div>
          </div>
          <div className="recall-card-face back">
            <div className="recall-card-label">Answer</div>
            <div className="recall-card-body">{current.card.back}</div>
            <div className="recall-card-hint">Click to flip back</div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {flipped && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="recall-actions"
          >
            <button className="btn btn-secondary recall-fail" onClick={() => handleReview(false)}>
              <X size={16} /> Forgot
            </button>
            <button className="btn btn-primary recall-pass" onClick={() => handleReview(true)}>
              <Check size={16} /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
