import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RefreshCcw, Sparkles, Send, MessageCircle, X } from 'lucide-react';
import { askTutor, TUTOR_DEFLECTION_MESSAGE } from '../api';

// ============================================================
// Floating "Ask AI" widget — docked at the bottom-right of the
// lesson page. Guarded so it only answers questions about the
// current track's curriculum.
// ============================================================
const AskAI = ({ track, node }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user'|'ai', text, off? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, open]);

  if (!track) return null;

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const answer = await askTutor({
        trackTitle: track.title,
        trackDescription: track.description,
        nodeTitle: node?.title,
        curriculumOutline: (track.nodes || []).map(n => ({ title: n.title, subtopics: n.subtopics || [] })),
        question: q,
      });
      const isDeflection = answer.trim() === TUTOR_DEFLECTION_MESSAGE.trim();
      setMessages(prev => [...prev, { role: 'ai', text: answer, off: isDeflection }]);
    } catch (e) {
      console.error('[Ask AI] failed:', e);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry — I could not reach the tutor right now. Please try again.', error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {!open && (
        <button className="ask-ai-fab" onClick={() => setOpen(true)} aria-label="Ask AI">
          <MessageCircle size={18} /> Ask AI
        </button>
      )}
      {open && (
        <div className="ask-ai-panel" role="dialog" aria-label="Ask the AI tutor">
          <div className="ask-ai-header">
            <div className="ask-ai-title"><Sparkles size={16} /> Ask the AI Tutor</div>
            <button className="ask-ai-close" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="ask-ai-scope">Scoped to: <strong>{track.title}</strong></div>
          <div className="ask-ai-messages" ref={listRef}>
            {messages.length === 0 && (
              <div className="ask-ai-hint">
                Ask anything about <strong>{track.title}</strong>. I'll only answer questions related to this course.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ask-ai-msg ${m.role}${m.off ? ' off' : ''}${m.error ? ' err' : ''}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="ask-ai-msg ai loading">
                <span className="ask-ai-dot" /><span className="ask-ai-dot" /><span className="ask-ai-dot" />
              </div>
            )}
          </div>
          <div className="ask-ai-inputrow">
            <textarea
              className="ask-ai-input"
              rows={1}
              placeholder={`Ask about "${node?.title || track.title}"...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button className="ask-ai-send" onClick={send} disabled={loading || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const LessonViewer = ({ node, track, onBack, onComplete, onRegenerate }) => {
  const [confirmingRegen, setConfirmingRegen] = useState(false);
  if (!node || !node.content) return null;
  const isCompleted = node.status === 'completed';

  const handleRegenerate = () => {
    setConfirmingRegen(false);
    onRegenerate && onRegenerate(node);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="lesson-topbar">
        <button onClick={onBack} className="btn btn-secondary" style={{border: 'none', background: 'transparent', color: 'var(--primary)'}}>
          <ArrowLeft size={16} /> Back to Roadmap
        </button>
        {onRegenerate && (
          <button
            className="btn btn-secondary lesson-regen-btn"
            onClick={() => setConfirmingRegen(true)}
            title="Regenerate this lesson with a fresh explanation"
          >
            <RefreshCcw size={14} /> Regenerate Lesson
          </button>
        )}
      </div>

      <div className="lesson-container">
        <h1 style={{marginBottom: '0.5rem', color: 'var(--primary)', fontSize: '2.5rem'}}>{node.title}</h1>
        <p style={{color: 'var(--text-muted)', marginBottom: '3rem', fontSize: '1.1rem'}}>{node.description}</p>
        {node.content.sections?.map((section, idx) => {
          if (section.type === 'text') return <div key={idx} className="lesson-section text" dangerouslySetInnerHTML={{__html: section.content.replace(/\n/g, '<br/>')}} />;
          if (section.type === 'code') return <div key={idx} className="lesson-section code"><div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase'}}>{section.language || 'code'}</div><pre><code>{section.content}</code></pre></div>;
          if (section.type === 'equation') return <div key={idx} className="lesson-section equation">{section.content}</div>;
          return null;
        })}
        {!isCompleted && (
          <div style={{marginTop: '4rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '2rem'}}>
            <button className="btn btn-primary" style={{padding: '1rem 3rem', fontSize: '1.1rem'}} onClick={() => onComplete(node.id)}>I Understand this Topic <CheckCircle size={20} /></button>
          </div>
        )}
      </div>

      {confirmingRegen && (
        <div className="modal-overlay" onClick={() => setConfirmingRegen(false)}>
          <div className="panel" style={{maxWidth: 480, padding: '2rem'}} onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginBottom: '0.75rem'}}>Regenerate this lesson?</h3>
            <p style={{color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
              The current content will be replaced with a fresh AI-generated explanation. Any flashcards
              for this lesson will be cleared and rebuilt after you complete it again.
            </p>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.5rem'}}>
              <button className="btn btn-secondary" onClick={() => setConfirmingRegen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegenerate}><RefreshCcw size={14} /> Regenerate</button>
            </div>
          </div>
        </div>
      )}

      <AskAI track={track} node={node} />
    </motion.div>
  );
};

export const QuizEvaluator = ({ node, isFinalExam, onBack, onSubmitAttempt }) => {
  const [answers, setAnswers] = useState({});
  const [retaking, setRetaking] = useState(false);
  const attemptCountRef = useRef(node?.quizResults?.length || 0);

  // When a fresh attempt lands (quizResults grows), exit retake mode so the
  // result screen shows again.
  useEffect(() => {
    const currentCount = node?.quizResults?.length || 0;
    if (currentCount > attemptCountRef.current) {
      attemptCountRef.current = currentCount;
      setRetaking(false);
      setAnswers({});
    }
  }, [node?.quizResults?.length]);

  if (!node || !node.quizData) return null;
  const isCompleted = node.status === 'completed';
  const hasAttempted = node.quizResults && node.quizResults.length > 0;
  const rawScore = hasAttempted ? node.quizResults[node.quizResults.length - 1].score : null;
  const lastScore = rawScore == null ? null : Number(rawScore.toFixed(2));

  // Show the result screen only when not actively retaking.
  if (!retaking && (isCompleted || hasAttempted)) {
     return (
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
         <button onClick={onBack} className="btn btn-secondary" style={{marginBottom: '2rem', border: 'none', background: 'transparent', color: 'var(--primary)'}}><ArrowLeft size={16} /> Back to Roadmap</button>
         <div className="panel quiz-container" style={{textAlign: 'center', padding: '3rem 1rem'}}>
           <h2 style={{marginBottom: '1rem'}}>Evaluation {isCompleted ? 'Passed' : 'Failed'}</h2>
           <div className={`score-display ${lastScore < 70 ? 'fail' : ''}`} style={{fontSize: '3rem', fontWeight: 'bold', color: lastScore >= 70 ? 'var(--accent)' : 'var(--danger)'}}>{lastScore}%</div>
           <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>{isCompleted ? "You mastered these concepts." : "You did not meet the 70% threshold. Review previous topics."}</p>
           {!isCompleted && (
             <button
               className="btn btn-primary"
               onClick={() => { setAnswers({}); setRetaking(true); }}
             >
               <RefreshCcw size={16} /> Retake {isFinalExam ? 'Exam' : 'Quiz'}
             </button>
           )}
         </div>
       </motion.div>
     );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <button onClick={onBack} className="btn btn-secondary" style={{marginBottom: '2rem', border: 'none', background: 'transparent', color: 'var(--primary)'}}><ArrowLeft size={16} /> Back</button>
      <div className="quiz-container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h2 style={{color: isFinalExam ? 'var(--danger)' : 'var(--warning)'}}>{isFinalExam ? 'Comprehensive Final Exam' : 'Gatekeeper Quiz'}: {node.title}</h2>
          <div className={`badge gatekeeper ${isFinalExam ? 'final' : ''}`}>Requires 70% to Pass</div>
        </div>
        {node.quizData.questions.map((q, qIndex) => (
          <div key={qIndex} className="panel" style={{marginBottom: '1.5rem'}}>
            <h3 style={{marginBottom: '1.5rem', fontSize: '1.1rem'}}>{qIndex + 1}. {q.question}</h3>
            <div>
              {q.options.map((opt, oIndex) => (
                <button key={oIndex} className={`quiz-option ${answers[qIndex] === oIndex ? 'selected' : ''}`} onClick={() => setAnswers(prev => ({...prev, [qIndex]: oIndex}))}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{textAlign: 'center', margin: '3rem 0'}}>
          <button className="btn btn-primary" style={{padding: '1rem 3rem', fontSize: '1.1rem', backgroundColor: isFinalExam ? 'var(--danger)' : 'var(--warning)'}} onClick={() => onSubmitAttempt(answers, node.id)} disabled={Object.keys(answers).length < node.quizData.questions.length}>Submit {isFinalExam ? 'Exam' : 'Quiz'}</button>
        </div>
      </div>
    </motion.div>
  );
};