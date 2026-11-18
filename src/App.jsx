import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BrainCircuit, Search, Award, Flame } from 'lucide-react';
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, query } from 'firebase/firestore';
import { auth, db, appId } from './firebase';
import { LoginScreen } from './components/LoginScreen';
import { callGeminiJSON, generateFlashcards, askTutor } from './api';
import { getLocalDateString } from './utils';
import { Dashboard } from './components/Dashboard';
import { ArchitectModal } from './components/ArchitectModal';
import { Roadmap } from './components/Roadmap';
import { LessonViewer, QuizEvaluator } from './components/Learning';
import { FlashcardsModal } from './components/Flashcards';
import { Badges } from './components/Badges';

import './index.css';

export default function PathFinderApp() {
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [actionText, setActionText] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [flashcardsNode, setFlashcardsNode] = useState(null);
  const searchContainerRef = useRef(null);

  const currentTrack = tracks.find(t => t.id === activeTrackId);
  const currentNode = currentTrack?.nodes.find(n => n.id === activeNodeId);
  const isCurrentlyFinalExam = currentNode && currentTrack && currentNode.id === currentTrack.nodes[currentTrack.nodes.length - 1].id;

  // src/App.jsx

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        // Keep this only if your development wrapper uses an initial auth token inject.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
        
      } catch (e) {
        console.error("Auth initialization error:", e);
      }
    };

    initAuth();

    // Listen to authentication state shifts (Login / Logout / Re-auth)
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false); // Make sure loading is disabled once Firebase determines user state
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const qTracks = query(collection(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks'));
    const unsubTracks = onSnapshot(qTracks, (snap) => {
      const fetched = [];
      snap.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => b.updatedAt - a.updatedAt);
      setTracks(fetched);
    });
    const qStats = doc(db, 'artifacts', appId, 'users', user.uid, 'stats', 'main');
    const unsubStats = onSnapshot(qStats, (snap) => {
      if (snap.exists()) setUserStats(snap.data());
      else setUserStats({ currentStreak: 0, activityHistory: {}, recentQuizzes: [] });
      setLoading(false);
    });
    return () => { unsubTracks(); unsubStats(); };
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const lowerQ = searchQuery.toLowerCase();
    const results = [];
    tracks.forEach(track => {
      let match = track.title.toLowerCase().includes(lowerQ) || track.description.toLowerCase().includes(lowerQ);
      const matchingNodes = track.nodes.filter(n => n.title.toLowerCase().includes(lowerQ) || (n.subtopics && n.subtopics.some(st => st.toLowerCase().includes(lowerQ))));
      if (match || matchingNodes.length > 0) {
        results.push({ trackId: track.id, trackTitle: track.title, matchingNodes: matchingNodes.map(n => n.title) });
      }
    });
    setSearchResults(results);
  }, [searchQuery, tracks]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) setSearchQuery("");
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  const recordActivity = async (type, details) => {
    if (!user || !db) return;
    const today = getLocalDateString();
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    let newStreak = userStats?.currentStreak || 0;
    if (userStats?.lastActivityDate !== today) {
      newStreak = (userStats?.lastActivityDate === yesterday) ? newStreak + 1 : 1;
    }
    const history = userStats?.activityHistory || {};
    let recentQuizzes = userStats?.recentQuizzes || [];
    if (type === 'quiz') {
      recentQuizzes.unshift({ title: details.nodeTitle, track: details.trackTitle, score: details.score, date: Date.now() });
      recentQuizzes = recentQuizzes.slice(0, 5);
    }
    const statsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'stats', 'main');
    await setDoc(statsRef, {
      currentStreak: newStreak, lastActivityDate: today,
      activityHistory: { ...history, [today]: (history[today] || 0) + 1 },
      recentQuizzes
    }, { merge: true });
  };

  const generateCurriculum = async ({ goal, difficulty, duration, contextInput }) => {
    setGenerating(true);
    setActionText("Synthesizing Curriculum Nodes...");

    try {
      // We consolidate the Expert Persona and the strict JSON schema into the System Prompt.
      // This tells Gemma 3 exactly how to behave and what structure to return.
      const sysPrompt = `You are an expert curriculum designer. Output ONLY valid JSON matching this exact structure:
    {
      "title": "String",
      "description": "String",
      "estimatedTotalHours": Number,
      "nodes": [
        {
          "id": "String (unique)",
          "title": "String",
          "description": "String",
          "subtopics": ["String 1", "String 2"],
          "isGatekeeper": Boolean,
          "estimatedHours": Number
        }
      ]
    }
    CRITICAL RULES:
    1. The node at index 0 MUST have "isGatekeeper": false.
    2. The FINAL node MUST have "isGatekeeper": true and act as a comprehensive final exam.
    3. Ensure subtopics are specific, one-level deep concepts.`;

      const userPrompt = `Goal: ${goal}\nLevel: ${difficulty}\nDuration: ${duration} days\nAdditional Context: ${contextInput}`;

      // Call our upgraded API handler
      const responseText = await callGeminiJSON(sysPrompt, userPrompt);

      // Parse the cleaned JSON string
      const parsedData = JSON.parse(responseText);

      // Prepare the nodes with initial state
      parsedData.nodes = parsedData.nodes.map((n, i) => ({
        ...n,
        status: i === 0 ? 'in-progress' : 'not-started',
        failedAttempts: 0,
        content: null,
        quizData: null
      }));

      // Save to Firestore using your existing logic
      await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks')), {
        ...parsedData,
        difficulty,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: 0,
        currentDeadlineDays: parseInt(duration)
      });

      setActiveTab('dashboard');
    } catch (e) {
      console.error("Curriculum Generation Error:", e);
      alert("The Architect failed to synthesize your roadmap. Please check your API key or parameters.");
    } finally {
      setGenerating(false);
    }
  };

  // Kicks off background flashcard generation for a completed node.
  // Fire-and-forget: the lesson UI never waits on this. A failure just
  // leaves the deck empty (next completion will try again).
  const queueFlashcards = (track, node) => {
    if (!track || !node || !node.content) return;
    if (Array.isArray(node.flashcards) && node.flashcards.length >= 3) return;
    (async () => {
      try {
        const cards = await generateFlashcards({
          trackTitle: track.title,
          nodeTitle: node.title,
          subtopics: node.subtopics || [],
          lessonContent: node.content,
        });
        const newNodes = track.nodes.map(n => n.id === node.id ? { ...n, flashcards: cards } : n);
        await setDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', track.id),
          { nodes: newNodes, updatedAt: Date.now() },
          { merge: true }
        );
      } catch (e) {
        console.warn('[Flashcards] Background generation failed:', e?.message || e);
      }
    })();
  };

  // Regenerate the current lesson's content (used by the Regenerate button).
  const regenerateLesson = async (node) => {
    if (!node || !currentTrack) return;
    setGenerating(true);
    setActionText(`Re-synthesizing ${node.title}...`);
    try {
      const sysPrompt = `You are an AI Tutor. Output ONLY valid JSON with a 'sections' array. Each section must have a 'type' ("text", "code", or "equation") and 'content'.
      CRITICAL RULES:
      1. Format "text" content using raw HTML tags (<ul>, <li>, <h2>, <strong>, etc.). DO NOT use Markdown.
      2. ONLY include "code" or "equation" sections if they contain actual, functional examples.
      3. NEVER generate placeholder blocks. If no code/equation applies to the topic, OMIT the object entirely from the JSON array.
      4. Provide external <a> links in a standard "text" section at the end. Only real, live URLs. No YouTube. No broken links.
      5. Produce a FRESH explanation - do not repeat phrasing from earlier attempts. Use clearer structure, different examples, and richer detail than a typical pass.`;
      const prompt = `Deeply explain: ${node.title}. Cover these subtopics: ${(node.subtopics || []).join(', ')}. Context: ${currentTrack.title}. Re-generate from scratch with improved clarity.`;

      const responseText = await callGeminiJSON(sysPrompt, prompt);
      const lessonData = JSON.parse(responseText);

      // Wipe old flashcards too — they were tied to the old content.
      const nodes = currentTrack.nodes.map(n => n.id === node.id ? { ...n, content: lessonData, flashcards: [] } : n);
      await setDoc(
        doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', currentTrack.id),
        { nodes, updatedAt: Date.now() },
        { merge: true }
      );
      // Re-generate the flashcard deck for the freshly-rewritten lesson.
      queueFlashcards({ ...currentTrack, nodes }, { ...node, content: lessonData, flashcards: [] });
    } catch (e) {
      console.error('[Regenerate] Failed:', e);
      alert('Could not regenerate the lesson. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartLesson = async (node) => {
    setActiveNodeId(node.id);
    if (node.content) {
      setActiveTab('lesson');
      // If a previously-generated lesson is missing its flashcards (older
      // content from before this feature shipped), backfill them silently.
      if (!Array.isArray(node.flashcards) || node.flashcards.length < 3) {
        queueFlashcards(currentTrack, node);
      }
      return;
    }
    setGenerating(true);
    setActionText(`Synthesizing subtopics for ${node.title}...`);
    try {
      const sysPrompt = `You are an AI Tutor. Output ONLY valid JSON with a 'sections' array. Each section must have a 'type' ("text", "code", or "equation") and 'content'.
      CRITICAL RULES:
      1. Format "text" content using raw HTML tags (<ul>, <li>, <h2>, <strong>, etc.). DO NOT use Markdown.
      2. ONLY include "code" or "equation" sections if they contain actual, functional examples.
      3. NEVER generate placeholder blocks (e.g., "// No code needed"). If no code/equation applies to the topic, OMIT the object entirely from the JSON array.
      4. Provide external <a> links in a standard "text" section at the end. Give only actual live urls from websites. Do not give any youtube urls or broken links.`;
      const prompt = `Deeply explain: ${node.title}. Cover these subtopics: ${node.subtopics.join(', ')}. Context: ${currentTrack.title}.`;

      const responseText = await callGeminiJSON(sysPrompt, prompt);
      const lessonData = JSON.parse(responseText);

      const nodes = currentTrack.nodes.map(n => n.id === node.id ? { ...n, content: lessonData } : n);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', currentTrack.id), { nodes, updatedAt: Date.now() }, { merge: true });

      // Generate the flashcard deck in parallel with the user reading the
      // lesson. By the time they hit "I Understand this Topic", the deck
      // is already saved and the Flashcards button on the roadmap is live.
      queueFlashcards({ ...currentTrack, nodes }, { ...node, content: lessonData });

      setActiveTab('lesson');
    } catch (e) { alert("Failed to generate lesson content."); } finally { setGenerating(false); }
  };

  const completeLesson = async (nodeId) => {
    let nodes = [...currentTrack.nodes];
    const nIdx = nodes.findIndex(n => n.id === nodeId);
    nodes[nIdx].status = 'completed';
    if (nIdx + 1 < nodes.length && nodes[nIdx + 1].status === 'not-started') nodes[nIdx + 1].status = 'in-progress';
    const progress = (nodes.filter(n => n.status === 'completed').length / nodes.length) * 100;
    const trackUpdate = { nodes, progress, updatedAt: Date.now() };
    if (progress === 100 && !currentTrack.completedAt) trackUpdate.completedAt = Date.now();
    await Promise.all([
      setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', currentTrack.id), trackUpdate, { merge: true }),
      recordActivity('lesson', { trackTitle: currentTrack.title, nodeTitle: currentNode.title })
    ]);
    setActiveTab('roadmap');
  };

  const handleStartQuiz = async (node, isFinalExam) => {
    setActiveNodeId(node.id);
    if (node.quizData) { setActiveTab('quiz'); return; }
    setGenerating(true);
    setActionText(`Compiling ${isFinalExam ? 'Final Exam' : 'Quiz'}...`);
    try {
      // UPDATED: Strict JSON schema + explicit question count (final exam >= 10)
      const questionCount = isFinalExam ? 12 : 5;

      const sysPrompt = `Act as a strict evaluator for ${currentTrack.difficulty} level. Output ONLY valid JSON with a "questions" array.
CRITICAL RULES:
1. The "questions" array MUST contain EXACTLY ${questionCount} question objects. Not fewer, not more.
2. Each object MUST have:
   - "question": The text of the question (string).
   - "options": An array of EXACTLY 4 distinct strings.
   - "correctIndex": A number (0-3) indicating the correct answer index.
3. ${isFinalExam
        ? 'This is a COMPREHENSIVE FINAL EXAM. Cover ALL subtopics across the entire curriculum. Mix difficulty: ~30% recall, ~40% application, ~30% analysis/synthesis.'
        : 'This is a module quiz. Focus tightly on the listed subtopics.'}
4. Do not duplicate questions. Each question must test a distinct concept.`;

      const prompt = isFinalExam
        ? `Generate the FINAL EXAM for the track "${currentTrack.title}". Cover the full curriculum across these modules: ${currentTrack.nodes.map(n => n.title).join('; ')}. Produce exactly ${questionCount} questions spanning all major topics.`
        : `Generate a ${questionCount}-question evaluation for the topic: ${node.title}. Focus on these subtopics: ${node.subtopics.join(', ')}.`;

      const responseText = await callGeminiJSON(sysPrompt, prompt);
      const quizData = JSON.parse(responseText);

      // Safety net: if final exam came back undersized, throw so the retry layer can try again
      if (isFinalExam && (!quizData.questions || quizData.questions.length < 10)) {
        throw new Error(`Final exam returned only ${quizData.questions?.length || 0} questions, expected ${questionCount}.`);
      }

      const nodes = currentTrack.nodes.map(n => n.id === node.id ? { ...n, quizData } : n);
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', currentTrack.id), { nodes, updatedAt: Date.now() }, { merge: true });
      setActiveTab('quiz');
    } catch (e) { alert("Failed to generate evaluation."); } finally { setGenerating(false); }
  };

  const submitQuizAttempt = async (answers, nodeId) => {
    let correct = 0;
    currentNode.quizData.questions.forEach((q, i) => { if (answers[i] === q.correctIndex) correct++; });
    const percentage = (correct / currentNode.quizData.questions.length) * 100;
    let nodes = [...currentTrack.nodes];
    const nIdx = nodes.findIndex(n => n.id === nodeId);
    nodes[nIdx].quizResults = [...(nodes[nIdx].quizResults || []), { date: Date.now(), score: percentage }];
    let deadlineShift = 0;
    if (percentage >= 70) {
      nodes[nIdx].status = 'completed';
      if (nIdx + 1 < nodes.length) nodes[nIdx + 1].status = 'in-progress';
    } else {
      nodes[nIdx].failedAttempts = (nodes[nIdx].failedAttempts || 0) + 1;
      if (nodes[nIdx].failedAttempts >= 2) deadlineShift = Math.ceil(nodes[nIdx].estimatedHours / 2);
    }
    const progress = (nodes.filter(x => x.status === 'completed').length / nodes.length) * 100;
    const trackUpdate = {
      nodes, progress, currentDeadlineDays: currentTrack.currentDeadlineDays + deadlineShift, updatedAt: Date.now()
    };
    if (progress === 100 && !currentTrack.completedAt) trackUpdate.completedAt = Date.now();

    // Optimistic update: advance UI immediately so Submit never appears frozen.
    setTracks(prev => prev.map(t => t.id === currentTrack.id ? { ...t, ...trackUpdate } : t));

    // Bound background Firestore writes with a timeout so a blocked network (e.g. ad-blocker
    // blocking firestore.googleapis.com) cannot hang the await indefinitely.
    const withTimeout = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Firestore write timed out')), ms))
    ]);

    try {
      await Promise.all([
        withTimeout(
          setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'learning_tracks', currentTrack.id), trackUpdate, { merge: true }),
          8000
        ),
        withTimeout(
          recordActivity('quiz', { trackTitle: currentTrack.title, nodeTitle: nodes[nIdx].title, score: percentage }),
          8000
        )
      ]);
    } catch (e) {
      console.warn('Quiz attempt saved locally but Firestore write failed:', e?.message || e);
    }
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  let displayStreak = userStats?.currentStreak || 0;
  let isStreakSafe = userStats?.lastActivityDate === today;
  if (userStats?.lastActivityDate && userStats.lastActivityDate !== today && userStats.lastActivityDate !== yesterday) displayStreak = 0;

  if (loading) return <div className="loading-overlay"><div className="loader"></div></div>;

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-brand" onClick={() => setActiveTab('dashboard')}><BrainCircuit size={28} /> PathFinder AI</div>
        <div className="search-container" ref={searchContainerRef}>
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(res => (
                <div key={res.trackId} className="search-result-item" onClick={() => { setActiveTrackId(res.trackId); setActiveTab('roadmap'); setSearchQuery(""); }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.25rem' }}>{res.trackTitle}</div>

                  {/* Restoring the subtopic match display */}
                  {res.matchingNodes.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {res.matchingNodes.slice(0, 3).join(', ')}{res.matchingNodes.length > 3 ? '...' : ''}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
        <div className="nav-stats">
          <div className={`stat-pill streak ${isStreakSafe ? 'safe' : ''}`}>
            {isStreakSafe ? <Award size={16} /> : <Flame size={16} />}
            <span>{displayStreak} <span className="hide-mobile">Day Streak</span></span>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem' }}>
            <span className="hide-mobile">Log Out</span>
          </button>
        </div>
      </nav>
      <main className="main-content">
        {generating && activeTab === 'roadmap' && (
          <div className="modal-overlay" style={{ flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div className="loader"></div>
            <h3>{actionText}</h3>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <Dashboard user={user} tracks={tracks} userStats={userStats} onNewTrack={() => setActiveTab('architect')} onSelectTrack={id => { setActiveTrackId(id); setActiveTab('roadmap'); }} onViewBadges={() => setActiveTab('badges')} />}
          {activeTab === 'badges' && <Badges user={user} tracks={tracks} onBack={() => setActiveTab('dashboard')} onViewRoadmap={(track) => { setActiveTrackId(track.id); setActiveTab('roadmap'); }} />}
          {activeTab === 'architect' && <ArchitectModal onCancel={() => setActiveTab('dashboard')} onGenerate={generateCurriculum} generating={generating} actionText={actionText} />}
          {activeTab === 'roadmap' && <Roadmap track={currentTrack} onBack={() => setActiveTab('dashboard')} onStartLesson={handleStartLesson} onStartQuiz={handleStartQuiz} onViewFlashcards={(node) => setFlashcardsNode(node)} />}
          {activeTab === 'lesson' && <LessonViewer node={currentNode} track={currentTrack} onBack={() => setActiveTab('roadmap')} onComplete={completeLesson} onRegenerate={regenerateLesson} />}
          {activeTab === 'quiz' && <QuizEvaluator node={currentNode} isFinalExam={isCurrentlyFinalExam} onBack={() => setActiveTab('roadmap')} onSubmitAttempt={submitQuizAttempt} />}
        </AnimatePresence>
        {flashcardsNode && (
          <FlashcardsModal
            user={user}
            track={currentTrack}
            node={flashcardsNode}
            onClose={() => setFlashcardsNode(null)}
          />
        )}
      </main>
    </div>
  );
}
