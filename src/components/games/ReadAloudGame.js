import React, { useState, useRef, useEffect } from 'react';

// ─── Simple SVM (Linear Kernel) ───────────────────────────────────────────────
// Features: [passRate3, passRate5, streakNorm, avgScoreNorm]
// Two one-vs-rest classifiers: advance vs rest, drop vs rest

class SimpleSVM {
  constructor() {
    this.advanceW = [2.1, 1.8, 1.5, 0.9];
    this.advanceB = -2.8;
    this.dropW    = [-2.0, -1.7, -2.2, -0.8];
    this.dropB    = 2.5;
  }

  extractFeatures(history) {
    const n = history.length;
    if (n === 0) return [0.5, 0.5, 0, 0.5];

    const last3 = history.slice(-3);
    const last5 = history.slice(-5);

    const passRate3 = last3.filter(h => h.passed).length / last3.length;
    const passRate5 = last5.filter(h => h.passed).length / last5.length;

    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].passed) streak++;
      else break;
    }
    const streakNorm = Math.min(streak / 5, 1);

    const avgScore = last3.reduce((s, h) => s + (h.score / Math.max(h.maxScore, 1)), 0) / last3.length;

    return [passRate3, passRate5, streakNorm, avgScore];
  }

  dot(w, x) { return w.reduce((s, wi, i) => s + wi * x[i], 0); }

  predict(history) {
    const x = this.extractFeatures(history);
    const advScore  = this.dot(this.advanceW, x) + this.advanceB;
    const dropScore = this.dot(this.dropW,    x) + this.dropB;
    if (advScore  > 0.4) return { action: 'advance', confidence: Math.min(advScore,  1), features: x };
    if (dropScore > 0.4) return { action: 'drop',    confidence: Math.min(dropScore, 1), features: x };
    return { action: 'stay', confidence: 0.5, features: x };
  }
}

const svm = new SimpleSVM();

// ─── Constants ────────────────────────────────────────────────────────────────
const TASKS_TO_COMPLETE = 3;

const LEVELS = {
  1: { label: 'Beginner', sentencesPerTask: 3, description: '3 sentences · Easy',         emoji: '🌱', color: '#4caf50', bg: '#e8f5e9' },
  2: { label: 'Easy',     sentencesPerTask: 4, description: '4 sentences · Getting there', emoji: '🌿', color: '#2196f3', bg: '#e3f2fd' },
  3: { label: 'Medium',   sentencesPerTask: 5, description: '5 sentences · Challenge',     emoji: '🌟', color: '#ff9800', bg: '#fff3e0' },
  4: { label: 'Hard',     sentencesPerTask: 6, description: '6 sentences · Tricky',        emoji: '🔥', color: '#9c27b0', bg: '#f3e5f5' },
  5: { label: 'Expert',   sentencesPerTask: 7, description: '7 sentences · Master it',     emoji: '💎', color: '#f44336', bg: '#fce4ec' },
};

const SENTENCE_BANK = {
  1: ["The cat sat","I like dogs","Birds can fly","Fish swim fast","Sun is bright","Dogs love bones","Bees make honey","Stars shine brightly","Grass is green","Snow is cold"],
  2: ["The cat sat here","I like to read","Birds fly very high","Fish swim in ponds","The sun shines bright","Dogs run in parks","Bees love sweet flowers","Stars twinkle at night","Grass grows after rain","Snow falls from clouds"],
  3: ["The cat sat on mat","I like to read books","Birds fly high in sky","Fish swim in the pond","The sun is bright today","Dogs run fast in parks","We play games every day","Stars twinkle in the sky","Flowers grow after the rain","Snow falls on cold days"],
  4: ["The cat sat on the mat","I like to read good books","Birds fly high in the sky","Fish swim fast in the pond","The sun is very bright today","Dogs love to run in parks","We play fun games every day","Stars twinkle brightly in the sky","Pretty flowers grow after heavy rain","Soft snow falls on cold days"],
  5: ["The cat sat quietly on the mat","I like to read books every night","Birds fly very high in the blue sky","Fish swim quickly in the deep pond","The bright sun shines warmly on us","Dogs love to run fast in parks","We play fun games outside every day","Bright stars twinkle clearly in the night sky","Pretty flowers always grow after the heavy rain","Soft white snow falls gently on cold days"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalize = (text) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\r?\n|\r/g, ' ')
    .toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

const similarity = (a, b) => {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) { if (longer.includes(shorter[i])) matches++; }
  return matches / longer.length;
};

const wordsMatch = (spoken, expected) => {
  const sw = normalize(spoken).split(' ');
  const ew = normalize(expected).split(' ');
  let matched = 0;
  ew.forEach((word, i) => { if (similarity(sw[i] || '', word) >= 0.8) matched++; });
  return matched / ew.length >= 0.8;
};

function pickSentence(lvl) {
  const pool = SENTENCE_BANK[lvl];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── SVM Insight Panel ────────────────────────────────────────────────────────
function SVMInsight({ history, prediction, visible }) {
  if (!visible || !prediction) return null;
  const { action, confidence, features } = prediction;
  const [passRate3, passRate5, streakNorm, avgScore] = features;

  const actionMeta = {
    advance: { icon: '⬆️', label: 'Advance Level', color: '#4caf50', bg: '#e8f5e9' },
    drop:    { icon: '⬇️', label: 'Drop Level',    color: '#f44336', bg: '#fce4ec' },
    stay:    { icon: '➡️', label: 'Stay at Level', color: '#ff9800', bg: '#fff3e0' },
  };
  const meta = actionMeta[action];

  return (
    <div style={{
      margin: '10px 0', padding: '12px 14px', borderRadius: 14,
      background: meta.bg, border: `2px solid ${meta.color}`,
      fontSize: 12, animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: meta.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        🤖 SVM Recommendation: {meta.icon} {meta.label}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#888' }}>
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
        {[
          { label: 'Pass rate (last 3)', val: passRate3 },
          { label: 'Pass rate (last 5)', val: passRate5 },
          { label: 'Win streak',         val: streakNorm },
          { label: 'Avg score',          val: avgScore },
        ].map(({ label, val }) => (
          <div key={label}>
            <div style={{ color: '#666', marginBottom: 2 }}>{label}</div>
            <div style={{ background: '#fff', borderRadius: 6, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${val * 100}%`, height: '100%', background: meta.color, borderRadius: 6, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ color: meta.color, fontWeight: 700, fontSize: 11, marginTop: 1 }}>
              {Math.round(val * 100)}%
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#777', borderTop: '1px solid #ddd', paddingTop: 6 }}>
        Training history: <strong>{history.length}</strong> task{history.length !== 1 ? 's' : ''} recorded
      </div>
    </div>
  );
}

// ─── Recap ────────────────────────────────────────────────────────────────────
function SentenceRecap({ correctSentences, wrongSentences, color, bg }) {
  if (correctSentences.length === 0 && wrongSentences.length === 0) return null;
  return (
    <div style={{ margin: '8px 0 12px', textAlign: 'left' }}>
      {correctSentences.length > 0 && (
        <div style={{ marginBottom: 8, padding: '7px 10px', background: bg, borderRadius: 10, border: `1px solid ${color}` }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4 }}>✅ Sentences you read correctly:</span>
          {correctSentences.map((s, i) => (
            <div key={i} style={{ fontSize: 12, fontWeight: 600, color: '#444', padding: '2px 0', borderBottom: i < correctSentences.length - 1 ? '1px solid #eee' : 'none' }}>
              "{s}"
            </div>
          ))}
        </div>
      )}
      {wrongSentences.length > 0 && (
        <div style={{ padding: '7px 10px', background: '#fff3f3', borderRadius: 10, border: '1px solid #ffcdd2' }}>
          <span style={{ fontSize: 11, color: '#c62828', fontWeight: 700, display: 'block', marginBottom: 4 }}>❌ Sentences to practice:</span>
          {wrongSentences.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              Expected: <strong style={{ color: '#c62828' }}>"{w.expected}"</strong><br />
              You said: <strong>"{w.said}"</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function ReadAloudGame({ saveGameScore }) {
  const [level, setLevel]                   = useState(1);
  const [unlockedLevel, setUnlockedLevel]   = useState(1);
  const [tasksCompleted, setTasksCompleted] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const [phase, setPhase]       = useState('levelSelect');
  const [taskNum, setTaskNum]   = useState(1);
  const [totalScore, setTotalScore] = useState(0);

  // SVM state
  const [taskHistory, setTaskHistory]     = useState([]);
  const [svmPrediction, setSvmPrediction] = useState(null);
  const [showSVM, setShowSVM]             = useState(false);

  // Per-task state
  const [currentSentence, setCurrentSentence] = useState('');
  const [sentenceCount, setSentenceCount]     = useState(0);
  const [correctCount, setCorrectCount]       = useState(0);
  const [score, setScore]                     = useState(0);
  const [taskBonus, setTaskBonus]             = useState(0);
  const [feedback, setFeedback]               = useState('');
  const [transcript, setTranscript]           = useState('');
  const [listening, setListening]             = useState(false);
  const [correctSentences, setCorrectSentences] = useState([]);
  const [wrongSentences, setWrongSentences]     = useState([]);

  const recognitionRef = useRef(null);

  const cfg = (lvl) => LEVELS[lvl];

  // Run SVM whenever history changes
  useEffect(() => {
    if (taskHistory.length > 0) {
      setSvmPrediction(svm.predict(taskHistory));
    }
  }, [taskHistory]);

  // ─── Start task ─────────────────────────────────────────────────────────
  const startTask = (lvl, task) => {
    setLevel(lvl);
    setTaskNum(task);
    setCurrentSentence(pickSentence(lvl));
    setSentenceCount(0);
    setCorrectCount(0);
    setScore(0);
    setTaskBonus(0);
    setFeedback('');
    setTranscript('');
    setListening(false);
    setCorrectSentences([]);
    setWrongSentences([]);
    setShowSVM(false);
    setPhase('playing');
  };

  const enterLevel = (lvl) => {
    const done = tasksCompleted[lvl] || 0;
    startTask(lvl, done >= TASKS_TO_COMPLETE ? 1 : done + 1);
  };

  const goLevelSelect = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setPhase('levelSelect');
  };

  // ─── Apply SVM decision ──────────────────────────────────────────────────
  const handleSVMAdvance = () => {
    if (!svmPrediction) return;
    const { action } = svmPrediction;
    let newLevel = level;
    if (action === 'advance' && level < 5) {
      newLevel = level + 1;
      setUnlockedLevel(prev => Math.max(prev, newLevel));
    } else if (action === 'drop' && level > 1) {
      newLevel = level - 1;
    }
    startTask(newLevel, 1);
  };

  // ─── TTS ────────────────────────────────────────────────────────────────
  const speakSentence = () => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(currentSentence);
    utt.rate = 0.5; utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  };

  const nextSentence = () => {
    setCurrentSentence(pickSentence(level));
    setFeedback('');
    setTranscript('');
  };

  // ─── Speech recognition ──────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setFeedback('❌ Speech recognition not supported. Use Chrome or Edge.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);

    recognition.onresult = (event) => {
      const results = Array.from(event.results[0]).map(r => r.transcript);
      const said = results[0];
      setTranscript(said);

      const isCorrect = results.some(r => wordsMatch(r, currentSentence));
      const newCount  = sentenceCount + 1;
      const { sentencesPerTask } = cfg(level);
      setSentenceCount(newCount);

      if (isCorrect) {
        const newScore   = score + 10;
        const newCorrect = correctCount + 1;
        setScore(newScore);
        setCorrectCount(newCorrect);
        setFeedback('🎉 Great reading!');
        setCorrectSentences(prev => [...prev, currentSentence]);
        if (newCount >= sentencesPerTask) setTimeout(() => finishTask(newScore, newCount, newCorrect), 1200);
        else setTimeout(nextSentence, 1400);
      } else {
        setFeedback(`❌ Not quite! You said: "${said}"`);
        setWrongSentences(prev => [...prev, { expected: currentSentence, said }]);
        if (newCount >= sentencesPerTask) setTimeout(() => finishTask(score, newCount, correctCount), 2000);
        else setTimeout(nextSentence, 2200);
      }
    };

    recognition.onerror = (e) => { setListening(false); setFeedback(`⚠️ Error: ${e.error}. Please try again.`); };
    recognition.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  const skipSentence = () => {
    const newCount = sentenceCount + 1;
    setSentenceCount(newCount);
    setFeedback(`⏭️ Skipped — sentence: "${currentSentence}"`);
    setWrongSentences(prev => [...prev, { expected: currentSentence, said: '(skipped)' }]);
    const { sentencesPerTask } = cfg(level);
    if (newCount >= sentencesPerTask) setTimeout(() => finishTask(score, newCount, correctCount), 1500);
    else setTimeout(nextSentence, 1600);
  };

  // ─── Finish task ─────────────────────────────────────────────────────────
  const finishTask = (finalScore, attempted, correct) => {
    const { sentencesPerTask } = cfg(level);
    const passMark = Math.ceil(sentencesPerTask * 0.6);
    const passed   = correct >= passMark;
    const maxScore = sentencesPerTask * 10;

    // Record in SVM history
    const newHistory = [...taskHistory, { passed, score: finalScore, maxScore, level }];
    setTaskHistory(newHistory);
    const pred = svm.predict(newHistory);
    setSvmPrediction(pred);
    setShowSVM(true);

    if (!passed) {
      setTotalScore(prev => prev + finalScore);
      setScore(finalScore);
      setPhase('gameOver');
      saveGameScore?.('read_aloud', totalScore + finalScore, level);
      return;
    }

    const bonus     = Math.max(0, correct - passMark) * 5;
    const taskScore = finalScore + bonus;
    setScore(taskScore);
    setTaskBonus(bonus);
    setTotalScore(prev => prev + taskScore);

    const prevDone = tasksCompleted[level] || 0;
    const newDone  = prevDone + 1;
    setTasksCompleted(prev => ({ ...prev, [level]: newDone }));

    if (newDone >= TASKS_TO_COMPLETE) {
      if (level < 5) setUnlockedLevel(prev => Math.max(prev, level + 1));
      setPhase('levelComplete');
      saveGameScore?.('read_aloud', totalScore + taskScore, level);
    } else {
      saveGameScore?.('read_aloud', totalScore + taskScore, level);
      setPhase('taskComplete');
    }
  };

  const restartAll = () => {
    setTotalScore(0);
    setUnlockedLevel(1);
    setTasksCompleted({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    setTaskHistory([]);
    setSvmPrediction(null);
    setPhase('levelSelect');
  };

  const { sentencesPerTask, label, emoji, color, bg } = cfg(level);
  const passMark          = Math.ceil(sentencesPerTask * 0.6);
  const tasksDoneForLevel = tasksCompleted[level] || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL SELECT
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'levelSelect') {
    return (
      <div className="game-screen">
        <h3 style={{ textAlign: 'center' }}>📖 Read Aloud</h3>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 8 }}>
          Complete <strong>3 tasks</strong> per level · SVM adapts your difficulty
        </p>

        {taskHistory.length >= 2 && svmPrediction && (
          <div style={{
            margin: '0 auto 14px', maxWidth: 400,
            padding: '10px 14px', borderRadius: 12,
            background: '#f0f4ff', border: '2px solid #5c6bc0',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, color: '#3949ab' }}>SVM Model Active</div>
              <div style={{ color: '#666', fontSize: 12 }}>
                Based on {taskHistory.length} tasks · recommends{' '}
                <strong>{svmPrediction.action === 'advance' ? '⬆️ harder' : svmPrediction.action === 'drop' ? '⬇️ easier' : '➡️ current'} level</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
          {Object.entries(LEVELS).map(([lvl, c]) => {
            const lvlNum    = Number(lvl);
            const isLocked  = lvlNum > unlockedLevel;
            const done      = tasksCompleted[lvlNum] || 0;
            const fullyDone = done >= TASKS_TO_COMPLETE;
            const isSvmSuggested = svmPrediction && taskHistory.length >= 2 &&
              ((svmPrediction.action === 'advance' && lvlNum === Math.min(level + 1, 5)) ||
               (svmPrediction.action === 'drop'    && lvlNum === Math.max(level - 1, 1)) ||
               (svmPrediction.action === 'stay'    && lvlNum === level));

            return (
              <button
                key={lvl}
                onClick={() => !isLocked && enterLevel(lvlNum)}
                disabled={isLocked}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  border: `2px solid ${isLocked ? '#ccc' : isSvmSuggested ? '#5c6bc0' : c.color}`,
                  background: isLocked ? '#f5f5f5' : isSvmSuggested ? '#f0f4ff' : c.bg,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.55 : 1,
                  textAlign: 'left', transition: 'transform 0.15s',
                  boxShadow: isSvmSuggested ? '0 0 0 3px #5c6bc044' : 'none',
                }}
                onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: 26, minWidth: 32, textAlign: 'center' }}>
                  {isLocked ? '🔒' : fullyDone ? '✅' : c.emoji}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: isLocked ? '#aaa' : '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Level {lvl} — {c.label}
                    {isSvmSuggested && <span style={{ fontSize: 11, background: '#5c6bc0', color: '#fff', borderRadius: 20, padding: '1px 7px' }}>🤖 SVM Pick</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {isLocked ? 'Complete previous level first' : c.description}
                  </div>
                </div>
                {!isLocked && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[1, 2, 3].map(t => (
                        <div key={t} style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: t <= done ? c.color : '#ddd',
                          border: `2px solid ${t <= done ? c.color : '#bbb'}`,
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: '#999' }}>{done}/3 tasks</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {totalScore > 0 && (
          <>
            <p style={{ textAlign: 'center', marginTop: 16, color: '#555' }}>
              Total score: <strong>{totalScore}</strong> · Tasks played: <strong>{taskHistory.length}</strong>
            </p>
            <div style={{ textAlign: 'center' }}>
              <button className="skip-button" onClick={restartAll} style={{ fontSize: 13 }}>🔄 Reset All Progress</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'taskComplete') {
    const nextTask  = tasksDoneForLevel + 1;
    const remaining = TASKS_TO_COMPLETE - tasksDoneForLevel;
    return (
      <div className="game-screen">
        <div className="game-completed" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 50 }}>⭐</div>
          <h4>Task {taskNum} Complete!</h4>
          <p style={{ color: '#666', margin: '2px 0 10px' }}>Level {level} — {label}</p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '10px 0 14px' }}>
            {[1, 2, 3].map(t => {
              const isPast = t < nextTask;
              const isCurr = t === nextTask;
              return (
                <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isPast ? color : isCurr ? bg : '#eee',
                    border: `3px solid ${isPast || isCurr ? color : '#ddd'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                    color: isPast ? '#fff' : isCurr ? color : '#ccc',
                  }}>
                    {isPast ? '✓' : t}
                  </div>
                  <span style={{ fontSize: 10, color: isPast ? color : '#aaa', fontWeight: 600 }}>
                    {isPast ? 'Done' : isCurr ? 'Next' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <SentenceRecap correctSentences={correctSentences} wrongSentences={wrongSentences} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />

          <p>
            Task score: <strong>{score}</strong>
            {taskBonus > 0 && <span style={{ color: '#f90', marginLeft: 6 }}>+{taskBonus} ⚡ bonus</span>}
          </p>
          <p style={{ color: '#888' }}>Total score: <strong>{totalScore}</strong></p>

          <div style={{
            margin: '10px auto', padding: '10px 16px', borderRadius: 10,
            background: '#fff8e1', border: '2px solid #ffc107',
            fontWeight: 700, fontSize: 14, display: 'inline-block',
          }}>
            🎯 {remaining} more task{remaining > 1 ? 's' : ''} to unlock Level {Math.min(level + 1, 5)}!
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {svmPrediction && svmPrediction.action !== 'stay' && taskHistory.length >= 2 && (
              <button className="check-button" onClick={handleSVMAdvance} style={{ background: '#5c6bc0', fontSize: 13 }}>
                🤖 SVM: {svmPrediction.action === 'advance' ? `⬆️ Go Level ${Math.min(level + 1, 5)}` : `⬇️ Go Level ${Math.max(level - 1, 1)}`}
              </button>
            )}
            {nextTask <= TASKS_TO_COMPLETE && (
              <button className="check-button" onClick={() => startTask(level, nextTask)}>▶ Task {nextTask}</button>
            )}
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'levelComplete') {
    const isLastLevel = level === 5;
    return (
      <div className="game-screen">
        <div className="game-completed" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>{isLastLevel ? '🏆' : '🎉'}</div>
          <h4>{isLastLevel ? 'You beat all levels!' : `Level ${level} Complete!`}</h4>
          <p style={{ color: '#555', margin: '2px 0 10px' }}>All 3 tasks finished!</p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0 14px' }}>
            {[1, 2, 3].map(t => (
              <div key={t} style={{
                width: 32, height: 32, borderRadius: '50%', background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#fff', fontWeight: 800,
              }}>✓</div>
            ))}
          </div>

          <SentenceRecap correctSentences={correctSentences} wrongSentences={wrongSentences} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />

          <p>
            Last task score: <strong>{score}</strong>
            {taskBonus > 0 && <span style={{ color: '#f90', marginLeft: 6 }}>+{taskBonus} ⚡</span>}
          </p>
          <p style={{ fontSize: 17, fontWeight: 700 }}>Total score: {totalScore}</p>

          {!isLastLevel && (
            <div style={{
              margin: '10px auto', padding: '10px 18px', borderRadius: 10,
              background: LEVELS[level + 1].bg, border: `2px solid ${LEVELS[level + 1].color}`,
              display: 'inline-block', fontWeight: 700, fontSize: 15,
            }}>
              🔓 Level {level + 1} — {LEVELS[level + 1].label} Unlocked!
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {svmPrediction && svmPrediction.action !== 'stay' && taskHistory.length >= 2 && (
              <button className="check-button" onClick={handleSVMAdvance} style={{ background: '#5c6bc0', fontSize: 13 }}>
                🤖 SVM: {svmPrediction.action === 'advance' ? `⬆️ Level ${Math.min(level + 1, 5)}` : `⬇️ Level ${Math.max(level - 1, 1)}`}
              </button>
            )}
            {!isLastLevel && (
              <button className="check-button" onClick={() => startTask(level + 1, 1)}>Next Level →</button>
            )}
            <button className="restart-button" onClick={() => startTask(level, 1)}>🔄 Replay Level</button>
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'gameOver') {
    return (
      <div className="game-screen">
        <div className="game-completed" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>😅</div>
          <h4>Task Failed!</h4>
          <p>Level {level} — {label} · Task {taskNum} of {TASKS_TO_COMPLETE}</p>
          <p>You needed <strong>{passMark}/{sentencesPerTask}</strong> correct to pass</p>
          <p>You got: <strong>{correctCount}/{sentenceCount}</strong> correct</p>
          <p style={{ color: '#888' }}>Total score: {totalScore}</p>

          <SentenceRecap correctSentences={correctSentences} wrongSentences={wrongSentences} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {svmPrediction && svmPrediction.action === 'drop' && level > 1 && (
              <button className="check-button" onClick={handleSVMAdvance} style={{ background: '#5c6bc0', fontSize: 13 }}>
                🤖 SVM: ⬇️ Try Level {level - 1}
              </button>
            )}
            <button className="check-button" onClick={() => startTask(level, taskNum)}>🔄 Retry Task {taskNum}</button>
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYING
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="game-screen">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>📖 Read Aloud</h3>
        <span style={{
          padding: '4px 12px', borderRadius: 20,
          background: bg, border: `1px solid ${color}`,
          fontSize: 13, fontWeight: 700,
        }}>
          {emoji} Lvl {level} · Task {taskNum}/{TASKS_TO_COMPLETE}
        </span>
      </div>

      {/* SVM status bar */}
      {taskHistory.length >= 2 && svmPrediction && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
          background: '#f0f4ff', borderRadius: 8, marginBottom: 8, fontSize: 12,
        }}>
          <span>🤖</span>
          <span style={{ color: '#5c6bc0', fontWeight: 600 }}>
            SVM ({taskHistory.length} tasks) → {
              svmPrediction.action === 'advance' ? '⬆️ Push harder' :
              svmPrediction.action === 'drop'    ? '⬇️ Ease up'     : '➡️ Maintain pace'
            }
          </span>
          <span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
            {Math.round(svmPrediction.confidence * 100)}% conf.
          </span>
        </div>
      )}

      {/* Task dots */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
        {[1, 2, 3].map(t => {
          const isPast = t < taskNum;
          const isCurr = t === taskNum;
          return (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isPast ? color : isCurr ? bg : '#eee',
                border: `3px solid ${isPast || isCurr ? color : '#ddd'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                color: isPast ? '#fff' : isCurr ? color : '#ccc',
              }}>
                {isPast ? '✓' : t}
              </div>
              <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>
                {isPast ? 'Done' : isCurr ? 'Now' : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="score" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>⭐ <strong>{score}</strong></span>
        <span>📝 <strong>{sentenceCount}/{sentencesPerTask}</strong> sentences</span>
        <span>✅ <strong>{correctCount}</strong> correct</span>
        <span style={{ fontSize: 12, color: '#999' }}>Need {passMark} to pass</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#eee', borderRadius: 8, height: 8, margin: '8px 0 14px', overflow: 'hidden' }}>
        <div style={{
          width: `${(sentenceCount / sentencesPerTask) * 100}%`,
          height: '100%', background: color, borderRadius: 8,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Sentence display */}
      <div style={{
        fontSize: '1.5rem', fontWeight: 700, padding: '20px',
        background: bg, borderRadius: 16, margin: '0 0 16px',
        border: `2px solid ${color}`, lineHeight: 1.5, textAlign: 'center',
      }}>
        {currentSentence}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={speakSentence} className="listen-button">🔊 Hear It</button>
        <button
          onClick={listening ? stopListening : startListening}
          className={listening ? 'skip-button' : 'check-button'}
          style={{ minWidth: 140 }}
        >
          {listening ? '⏹ Stop' : '🎤 Read Aloud'}
        </button>
        <button onClick={skipSentence} className="new-word-button">⏭ Skip</button>
      </div>

      {listening && (
        <div style={{ color, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>
          🎙 Listening… speak now
        </div>
      )}

      {transcript && (
        <div style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', marginBottom: 8 }}>
          You said: "<em>{transcript}</em>"
        </div>
      )}

      {feedback && (
        <div className={`feedback ${feedback.includes('🎉') ? 'correct' : 'incorrect'}`}>
          {feedback}
        </div>
      )}

      {correctSentences.length > 0 && (
        <div style={{ margin: '8px 0', padding: '7px 10px', background: bg, borderRadius: 10, border: `1px solid ${color}` }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4 }}>✅ Read correctly so far:</span>
          {correctSentences.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: '#444', marginBottom: 2 }}>"{s}"</div>
          ))}
        </div>
      )}

      <div className="game-controls" style={{ marginTop: 10 }}>
        <button onClick={goLevelSelect} className="skip-button">🏠 Level Select</button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

export default ReadAloudGame;