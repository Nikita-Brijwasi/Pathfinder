import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, AlertTriangle, Circle, Layers, Clock, Play, BookText, Brain } from 'lucide-react';
import { ProgressRing } from './Shared';

export const Roadmap = ({ track, onBack, onStartLesson, onStartQuiz, onViewFlashcards }) => {
  if (!track) return null;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="section-header">
        <div>
          <button onClick={onBack} className="btn btn-secondary" style={{padding: '0.5rem 1rem', marginBottom: '1rem', background: 'transparent', border: 'none', color: 'var(--primary)'}}>
            <ArrowLeft size={16} /> Command Center
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
             <h1 className="section-title" style={{marginBottom: 0}}>{track.title}</h1>
             <span className="badge" style={{color: `var(--${track.difficulty === 'Advanced' ? 'danger' : track.difficulty === 'Intermediate' ? 'primary' : 'accent'})`, border: '1px solid currentColor', backgroundColor: 'transparent'}}>
                {track.difficulty || 'Intermediate'}
             </span>
          </div>
          <p style={{color: 'var(--text-muted)', marginTop: '0.5rem'}}>{track.description}</p>
        </div>
        <ProgressRing progress={track.progress} size={80} strokeWidth={8} />
      </div>
      <div className="panel" style={{marginTop: '2rem'}}>
        <div className="timeline" style={{maxWidth: '800px', margin: '0 auto'}}>
          {track.nodes.map((node, index) => {
            const isActive = node.status === 'in-progress';
            const isCompleted = node.status === 'completed';
            const isFinalExam = index === track.nodes.length - 1;
            return (
              <div className={`timeline-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${node.isGatekeeper ? 'gatekeeper' : ''} ${isFinalExam ? 'final' : ''}`} key={node.id}>
                <div className="timeline-line"></div>
                <div className="node-icon">
                  {isCompleted ? <CheckCircle size={20} /> : node.isGatekeeper ? <AlertTriangle size={20} /> : <Circle size={20} />}
                </div>
                <div className="node-content-box">
                  <div className="node-header" style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span className="node-title" style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{node.title}</span>
                    {node.isGatekeeper && <span className={`badge gatekeeper ${isFinalExam ? 'final' : ''}`}>{isFinalExam ? 'Final Exam' : 'Quiz'}</span>}
                  </div>
                  <p className="node-desc" style={{marginBottom: '0', color: 'var(--text-muted)'}}>{node.description}</p>
                  {node.subtopics && node.subtopics.length > 0 && (
                    <div className="subtopics-list">
                      {node.subtopics.map((st, i) => (
                        <span key={i} className="subtopic-pill"><Layers size={12}/> {st}</span>
                      ))}
                    </div>
                  )}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem'}}>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                      <Clock size={14} style={{verticalAlign: 'middle', marginRight: '4px'}}/> Est. {node.estimatedHours}h 
                      {node.failedAttempts > 0 && <span style={{color: 'var(--danger)', marginLeft: '12px', fontWeight: 'bold'}}>• {node.failedAttempts} Failed Attempts</span>}
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      {isActive && !node.isGatekeeper && <button className="btn btn-primary" onClick={() => onStartLesson(node)}>Start Lesson <Play size={16} /></button>}
                      {isActive && node.isGatekeeper && <button className="btn btn-danger" style={{backgroundColor: isFinalExam ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)', color: isFinalExam ? 'var(--danger)' : 'var(--warning)'}} onClick={() => onStartQuiz(node, isFinalExam)}>Start {isFinalExam ? 'Exam' : 'Quiz'} <BookText size={16} /></button>}
                      {isCompleted && !node.isGatekeeper && <button className="btn btn-secondary" onClick={() => onStartLesson(node)}>Review Lesson</button>}
                      {isCompleted && !node.isGatekeeper && Array.isArray(node.flashcards) && node.flashcards.length > 0 && onViewFlashcards && (
                        <button className="btn btn-primary" onClick={() => onViewFlashcards(node)}>
                          <Brain size={16} /> Flashcards
                        </button>
                      )}
                      {isCompleted && node.isGatekeeper && <button className="btn btn-secondary" onClick={() => onStartQuiz(node, isFinalExam)}>Review Results</button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};