import React, { useState } from 'react';
import { signInWithPopup, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { BrainCircuit } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export const LoginScreen = () => {
    const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const handleGoogleLogin = async () => {
    try {
      // Apply persistence based on checkbox state
      const persistenceType = keepLoggedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  return (
    <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="panel" style={{ textAlign: 'center', padding: '3rem', maxWidth: '400px', width: '100%' }}>
        <BrainCircuit size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>PathFinder AI</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Sign in to continue your learning journey.</p>
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="keepLoggedIn" 
            checked={keepLoggedIn} 
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
          />
          <label htmlFor="keepLoggedIn" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
            Keep me logged in
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleGoogleLogin} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};