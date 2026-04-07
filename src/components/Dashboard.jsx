import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Play, Layers, Calendar, BookOpen, Shield, ChevronRight, Award, History } from 'lucide-react';
import { ProgressRing, ActivityCalendar } from './Shared';

export const Dashboard = ({ tracks, userStats, onNewTrack, onSelectTrack, user }) => {
  const activeTracks = tracks.filter(t => t.progress < 100);
  const completedTracks = tracks.filter(t => t.progress === 100);
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Student';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="section-header">
        <h1 className="section-title" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Welcome back {firstName}
          </h1>
        <button className="btn btn-primary" onClick={onNewTrack}><Plus size={18} /> New Track</button>
      </div>

      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="panel focus-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Target size={20} color="var(--primary)" /> Today's Focus
            </h3>
            {activeTracks.length > 0 ? (
              <div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Constraint-engine dictates completing the next node to maintain velocity.</p>
                {activeTracks.slice(0, 1).map(track => {
                  const nextNode = track.nodes.find(n => n.status === 'in-progress');
                  if (!nextNode) return null;
                  return (
                    <div key={track.id} style={{ backgroundColor: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>{track.title}</div>
                      <div style={{ fontWeight: '700', fontSize: '1.25rem', marginBottom: '1rem' }}>{nextNode.title}</div>
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onSelectTrack(track.id)}>
                        Jump In <Play size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : <p style={{ color: 'var(--text-muted)' }}>No active tracks. Build one to initiate scheduling.</p>}
          </div>

          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}><Layers size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Active Roadmaps</h3>
            {activeTracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Target size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p>Your learning journey is empty.</p>
              </div>
            ) : (
              activeTracks.map(track => (
                <div key={track.id} className="track-card" onClick={() => onSelectTrack(track.id)}>
                  <ProgressRing progress={track.progress} size={64} strokeWidth={6} />
                  <div className="track-details">
                    <h3>{track.title}</h3>
                    <div className="track-meta" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '1rem' }}>
                      <span><Calendar size={14} style={{ verticalAlign: 'middle' }} /> {track.currentDeadlineDays} days left</span>
                      <span><BookOpen size={14} style={{ verticalAlign: 'middle' }} /> {track.nodes.length} Topics</span>
                      <span style={{ color: `var(--${track.difficulty === 'Advanced' ? 'danger' : track.difficulty === 'Intermediate' ? 'primary' : 'accent'})` }}>
                        <Shield size={14} style={{ verticalAlign: 'middle' }} /> {track.difficulty || 'Intermediate'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="panel">
            <h3 style={{ marginBottom: '1rem' }}><Award size={18} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} /> Earned Badges</h3>
            {completedTracks.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete roadmaps to earn achievement badges.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {completedTracks.map(t => {
                  const diffColor = t.difficulty === 'Advanced' ? 'danger' : t.difficulty === 'Intermediate' ? 'primary' : 'accent';
                  return (
                    <div key={t.id} style={{ textAlign: 'center', backgroundColor: 'var(--bg-dark)', padding: '1rem 0.5rem', borderRadius: '12px', border: `1px solid var(--${diffColor})`, width: '100%', maxWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Shield size={32} color={`var(--${diffColor})`} style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '0.25rem' }}>{t.title}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.difficulty || 'Intermediate'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: '0.5rem' }}><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Activity Map</h3>
            <ActivityCalendar history={userStats?.activityHistory || {}} />
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: '1.5rem' }}><History size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Recent Exams</h3>
            {(!userStats?.recentQuizzes || userStats.recentQuizzes.length === 0) ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No evaluations attempted yet.</p>
            ) : (
              <div>
                {userStats.recentQuizzes.map((quiz, i) => (
                  <div key={i} className="recent-quiz-item">
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quiz.track}</div>
                    </div>
                    <div className={`score-badge ${quiz.score >= 70 ? 'pass' : 'fail'}`}>
                      {Math.round(quiz.score)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};