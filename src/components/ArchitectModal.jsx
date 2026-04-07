import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const ArchitectModal = ({ onCancel, onGenerate, generating, actionText }) => {
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [duration, setDuration] = useState('30');
  const [contextInput, setContextInput] = useState('');

  const submit = (e) => { e.preventDefault(); onGenerate({ goal, difficulty, duration, contextInput }); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
      <div className="modal-content">
        <button className="close-modal" onClick={onCancel} style={{position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer'}}>&times;</button>
        <h2 style={{marginBottom: '0.5rem'}}>The Architect</h2>
        <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Define parameters. AI will synthesize a structured roadmap with nested subtopics.</p>
        {generating ? (
          <div className="loading-overlay">
            <div className="loader" style={{marginBottom: '1.5rem'}}></div>
            <h3 style={{color: 'var(--primary)'}}>{actionText}</h3>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="input-group">
              <label>Primary Goal</label>
              <input type="text" className="input-control" placeholder="e.g., Learn Advanced React Hooks" value={goal} onChange={e => setGoal(e.target.value)} required />
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
              <div className="input-group" style={{flex: 1}}>
                <label>Difficulty</label>
                <select className="input-control" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div className="input-group" style={{flex: 1}}>
                <label>Duration (Days)</label>
                <input type="number" className="input-control" value={duration} onChange={e => setDuration(e.target.value)} min="1" />
              </div>
            </div>
            <div className="input-group">
              <label>Raw Syllabus Context (Optional)</label>
              <textarea className="input-control" placeholder="Paste specific concepts you want covered..." value={contextInput} onChange={e => setContextInput(e.target.value)}></textarea>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!goal}>Generate Roadmap</button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
};