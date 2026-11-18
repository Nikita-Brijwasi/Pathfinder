import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Check, X, Trophy, Sparkles } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../firebase';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Simple SM-2-ish spaced repetition update — runs locally so the next time
// the same deck is opened, cards the user got wrong come first.
const reviewCard = (card, knewIt) => {
  const ease = Math.max(1.3, (card.easeFactor || 2.5) + (knewIt ? 0.1 : -0.2));
  const nextInterval = knewIt ? Math.max(1, Math.round((card.intervalDays || 1) * ease)) : 1;
  return {
    ...card,
    lastReviewedAt: Date.now(),
    reviewCount: (card.reviewCount || 0) + 1,
    easeFactor: ease,
    intervalDays: nextInterval,
    dueAt: Date.now() + nextInterval * ONE_DAY_MS,
  };
};

export const FlashcardsModal = ({ user, track, node, onClose }) => {
  const cards = Array.isArray(node?.flashcards) ? node.flashcards : [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState({}); // cardIndex -> knewIt
  const [pendingSaves, setPendingSaves] = useState([]); // [{cardIndex, updatedCard}]

  // Persist any pending review updates when the modal closes.
  useEffect(() => {
    return () => {
      if (!pendingSaves.length || !user || !db || !track || !node) return;
      (async () => {
        try {
          const newCards = (node.flashcards || []).slice();
          for (const { cardIndex, updatedCard } of pendingSaves) {
            newCards[cardIndex] = updatedCard;
          }
          const newNodes = track.nodes.map(n => n.id === node.id ? { ...n, flashcards: newCards } : n);
          await setDoc(
            doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', track.id),
            { nodes: newNodes, updatedAt: Date.now() },
            { merge: true }
          );
        } catch (e) {
          console.warn('[Flashcards] could not save review state:', e?.message || e);
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSaves.length]);

  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isDone = idx >= cards.length;
  const current = !isDone ? cards[idx] : null;

  const handleReview = (knewIt) => {
    if (!current) return;
    const updated = reviewCard(current, knewIt);
    setReviewed(prev => ({ ...prev, [idx]: knewIt }));
    setPendingSaves(prev => [...prev, { cardIndex: idx, updatedCard: updated }]);
    setFlipped(false);
    setIdx(i => i + 1);
  };

  const handleRestart = () => {
    setIdx(0);
    setFlipped(false);
    setReviewed({});
  };

  if (!node) return null;

  // Empty state — flashcards were never generated for this lesson.
  if (!cards.length) {
    return (
      <motion.div
        className="modal-overlay flashcards-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="flashcards-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flashcards-header">
            <div className="flashcards-title"><Brain size={18} /> Flashcards</div>
            <button className="flashcards-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
          <div className="flashcards-empty">
            <Sparkles size={28} color="var(--primary)" />
            <p>No flashcards generated yet for this lesson.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              They'll appear here automatically the next time the lesson is opened.
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="modal-overlay flashcards-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flashcards-modal"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flashcards-header">
          <div className="flashcards-title">
            <Brain size={18} /> Flashcards
            <span className="flashcards-subtitle">{node.title}</span>
          </div>
          <button className="flashcards-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {isDone ? (
          <div className="flashcards-summary">
            <Trophy size={42} color="var(--primary)" />
            <div className="flashcards-summary-score">
              {Object.values(reviewed).filter(Boolean).length} / {cards.length}
            </div>
            <p className="flashcards-summary-msg">
              {Object.values(reviewed).filter(Boolean).length === cards.length
                ? 'All clear — these are locked in.'
                : 'Cards you missed will surface again next time you open this deck.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleRestart}>
                <RotateCcw size={14} /> Review again
              </button>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flashcards-meta">
              <span className="flashcards-counter">Card {idx + 1} of {cards.length}</span>
            </div>

            <div
              className={`recall-card flashcards-card ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped(f => !f)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); } }}
            >
              <div className="recall-card-inner">
                <div className="recall-card-face front">
                  <div className="recall-card-label">Question</div>
                  <div className="recall-card-body">{current.front}</div>
                  <div className="recall-card-hint">Click to reveal</div>
                </div>
                <div className="recall-card-face back">
                  <div className="recall-card-label">Answer</div>
                  <div className="recall-card-body">{current.back}</div>
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
          </>
        )}
      </motion.div>
    </motion.div>
  );
};
