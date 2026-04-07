import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, RefreshCcw } from 'lucide-react';

export const LessonViewer = ({ node, onBack, onComplete }) => {
  if (!node || !node.content) return null;
  const isCompleted = node.status === 'completed';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="btn btn-secondary" style={{marginBottom: '2rem', border: 'none', background: 'transparent', color: 'var(--primary)'}}>
        <ArrowLeft size={16} /> Back to Roadmap
      </button>
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
    </motion.div>
  );
};

export const QuizEvaluator = ({ node, isFinalExam, onBack, onSubmitAttempt }) => {
  const [answers, setAnswers] = useState({});
  if (!node || !node.quizData) return null;
  const isCompleted = node.status === 'completed';
  const hasAttempted = node.quizResults && node.quizResults.length > 0;
  const lastScore = hasAttempted ? node.quizResults[node.quizResults.length - 1].score : null;

  if (isCompleted || (hasAttempted && Object.keys(answers).length === 0)) {
     return (
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
         <button onClick={onBack} className="btn btn-secondary" style={{marginBottom: '2rem', border: 'none', background: 'transparent', color: 'var(--primary)'}}><ArrowLeft size={16} /> Back to Roadmap</button>
         <div className="panel quiz-container" style={{textAlign: 'center', padding: '3rem 1rem'}}>
           <h2 style={{marginBottom: '1rem'}}>Evaluation {isCompleted ? 'Passed' : 'Failed'}</h2>
           <div className={`score-display ${lastScore < 70 ? 'fail' : ''}`} style={{fontSize: '3rem', fontWeight: 'bold', color: lastScore >= 70 ? 'var(--accent)' : 'var(--danger)'}}>{lastScore}%</div>
           <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>{isCompleted ? "You mastered these concepts." : "You did not meet the 70% threshold. Review previous topics."}</p>
           {!isCompleted && <button className="btn btn-primary" onClick={() => setAnswers({})}><RefreshCcw size={16} /> Retake {isFinalExam ? 'Exam' : 'Quiz'}</button>}
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