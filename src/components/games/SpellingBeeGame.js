import React, { useState, useRef, useEffect } from 'react';

// ─── Simple SVM (Linear Kernel) ───────────────────────────────────────────────
class SimpleSVM {
  constructor() {
    this.advanceW = [2.1, 1.8, 1.5, 0.9];
    this.advanceB = -2.8;
    this.dropW    = [-2.0, -1.7, -2.2, -0.8];
    this.dropB    = 2.5;
  }

  extractFeatures(history) {
    if (history.length === 0) return [0.5, 0.5, 0, 0.5];
    const last3 = history.slice(-3);
    const last5 = history.slice(-5);
    const passRate3 = last3.filter(h => h.passed).length / last3.length;
    const passRate5 = last5.filter(h => h.passed).length / last5.length;
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].passed) streak++; else break;
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
  1: { label: 'Beginner', wordsPerTask: 3, description: '3-letter words · Easy',         emoji: '🌱', color: '#4caf50', bg: '#e8f5e9' },
  2: { label: 'Easy',     wordsPerTask: 4, description: '4-letter words · Getting there', emoji: '🌿', color: '#2196f3', bg: '#e3f2fd' },
  3: { label: 'Medium',   wordsPerTask: 5, description: '5-letter words · Challenge',     emoji: '🌟', color: '#ff9800', bg: '#fff3e0' },
  4: { label: 'Hard',     wordsPerTask: 6, description: '6-letter words · Tricky',        emoji: '🔥', color: '#9c27b0', bg: '#f3e5f5' },
  5: { label: 'Expert',   wordsPerTask: 7, description: '7+ letter words · Master it',    emoji: '💎', color: '#f44336', bg: '#fce4ec' },
};

const WORD_BANK = {
  1: [
    { word: 'CAT',  hint: '🐱 A furry pet that meows' },
    { word: 'DOG',  hint: '🐶 A loyal pet that barks' },
    { word: 'SUN',  hint: '☀️ Shines bright in the sky' },
    { word: 'BEE',  hint: '🐝 Makes honey and buzzes' },
    { word: 'ANT',  hint: '🐜 Tiny insect that works hard' },
    { word: 'EGG',  hint: '🥚 Comes from a bird or hen' },
    { word: 'CUP',  hint: '☕ You drink from this' },
    { word: 'HAT',  hint: '🎩 Worn on your head' },
    { word: 'BUS',  hint: '🚌 Big vehicle on the road' },
    { word: 'PIG',  hint: '🐷 Pink farm animal' },
    { word: 'HEN',  hint: '🐔 Female chicken' },
    { word: 'FOX',  hint: '🦊 Clever orange wild animal' },
    { word: 'OWL',  hint: '🦉 Wise bird that hoots at night' },
    { word: 'COW',  hint: '🐄 Farm animal that gives milk' },
    { word: 'BAT',  hint: '🦇 Flies at night, sleeps upside down' },
  ],
  2: [
    { word: 'BIRD',  hint: '🐦 Has wings and can fly' },
    { word: 'FISH',  hint: '🐠 Lives in water and swims' },
    { word: 'FROG',  hint: '🐸 Jumps and lives near water' },
    { word: 'DUCK',  hint: '🦆 Swims on ponds and quacks' },
    { word: 'BEAR',  hint: '🐻 Big furry animal in the forest' },
    { word: 'LION',  hint: '🦁 King of the jungle' },
    { word: 'CAKE',  hint: '🎂 Sweet food for birthdays' },
    { word: 'RAIN',  hint: '🌧️ Falls from clouds in the sky' },
    { word: 'STAR',  hint: '⭐ Twinkles in the night sky' },
    { word: 'MOON',  hint: '🌙 Glows in the sky at night' },
    { word: 'TREE',  hint: '🌳 Has roots, trunk and branches' },
    { word: 'BOOK',  hint: '📚 You read stories in this' },
    { word: 'SHIP',  hint: '🚢 Travels across the ocean' },
    { word: 'MILK',  hint: '🥛 White drink from a cow' },
    { word: 'BALL',  hint: '⚽ Round toy you kick or throw' },
  ],
  3: [
    { word: 'APPLE',  hint: '🍎 Red or green fruit on a tree' },
    { word: 'TIGER',  hint: '🐯 Orange striped big cat' },
    { word: 'GRAPE',  hint: '🍇 Small purple or green fruit' },
    { word: 'EAGLE',  hint: '🦅 Large bird that soars high' },
    { word: 'HORSE',  hint: '🐴 You can ride this animal' },
    { word: 'SHEEP',  hint: '🐑 Fluffy animal that gives wool' },
    { word: 'OCEAN',  hint: '🌊 Huge body of salt water' },
    { word: 'CLOUD',  hint: '☁️ White fluffy thing in the sky' },
    { word: 'PLANT',  hint: '🌱 Living thing that grows in soil' },
    { word: 'BREAD',  hint: '🍞 Baked food made from flour' },
    { word: 'TRAIN',  hint: '🚂 Travels on metal tracks' },
    { word: 'LIGHT',  hint: '💡 Brightens up a dark room' },
    { word: 'WITCH',  hint: '🧙 Flies on a broomstick' },
    { word: 'GLOBE',  hint: '🌍 Round model of the Earth' },
    { word: 'CHESS',  hint: '♟️ Board game with kings and queens' },
  ],
  4: [
    { word: 'BASKET',  hint: '🧺 Used to carry things' },
    { word: 'BRIDGE',  hint: '🌉 Connects two sides over water' },
    { word: 'CASTLE',  hint: '🏰 Where a king or queen lives' },
    { word: 'DOCTOR',  hint: '👨‍⚕️ Helps sick people get better' },
    { word: 'FINGER',  hint: '☝️ Part of your hand' },
    { word: 'GARDEN',  hint: '🌸 Place where flowers grow' },
    { word: 'HAMMER',  hint: '🔨 Tool for hitting nails' },
    { word: 'INSECT',  hint: '🐛 Small creature with six legs' },
    { word: 'JUNGLE',  hint: '🌴 Dense tropical forest' },
    { word: 'KETTLE',  hint: '🫖 Used to boil water for tea' },
    { word: 'LADDER',  hint: '🪜 Used to climb up high' },
    { word: 'MARKET',  hint: '🛒 Place where you buy things' },
    { word: 'NEEDLE',  hint: '🪡 Used for sewing thread' },
    { word: 'ORANGE',  hint: '🍊 Round citrus fruit' },
    { word: 'PENCIL',  hint: '✏️ Used for writing and drawing' },
  ],
  5: [
    { word: 'BALLOON',   hint: '🎈 Filled with air and floats up' },
    { word: 'BICYCLE',   hint: '🚲 Two wheels, you pedal it' },
    { word: 'CAPTAIN',   hint: '👨‍✈️ Leader of a ship or team' },
    { word: 'DIAMOND',   hint: '💎 Precious sparkling gemstone' },
    { word: 'EMPEROR',   hint: '👑 Ruler of a great empire' },
    { word: 'FEATHER',   hint: '🪶 Light fluffy part of a bird' },
    { word: 'GIRAFFE',   hint: '🦒 Tallest animal with long neck' },
    { word: 'HIGHWAY',   hint: '🛣️ Fast road for cars' },
    { word: 'IMAGINE',   hint: '💭 To think of something in your mind' },
    { word: 'JOURNEY',   hint: '🗺️ A long trip from place to place' },
    { word: 'KITCHEN',   hint: '🍳 Room where food is cooked' },
    { word: 'LANTERN',   hint: '🏮 Light carried in your hand' },
    { word: 'MORNING',   hint: '🌅 Start of the day after night' },
    { word: 'NETWORK',   hint: '🕸️ Connected system of things' },
    { word: 'OCTOPUS',   hint: '🐙 Sea creature with eight arms' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pickWords(lvl, count) {
  return [...WORD_BANK[lvl]].sort(() => Math.random() - 0.5).slice(0, count);
}

function speakWord(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(word);
  utt.rate = 0.7; utt.lang = 'en-US';
  window.speechSynthesis.speak(utt);
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
            <div style={{ color: meta.color, fontWeight: 700, fontSize: 11, marginTop: 1 }}>{Math.round(val * 100)}%</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#777', borderTop: '1px solid #ddd', paddingTop: 6 }}>
        Training history: <strong>{history.length}</strong> task{history.length !== 1 ? 's' : ''} recorded
      </div>
    </div>
  );
}

// ─── Word Recap ───────────────────────────────────────────────────────────────
function WordRecap({ correctWords, wrongWords, color, bg }) {
  if (!correctWords.length && !wrongWords.length) return null;
  return (
    <div style={{ margin: '8px 0 12px', textAlign: 'left' }}>
      {correctWords.length > 0 && (
        <div style={{ marginBottom: 8, padding: '7px 10px', background: bg, borderRadius: 10, border: `1px solid ${color}` }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4 }}>✅ Words you spelled correctly:</span>
          {correctWords.map((w, i) => (
            <div key={i} style={{ fontSize: 12, fontWeight: 700, color: '#444', padding: '2px 0', borderBottom: i < correctWords.length - 1 ? '1px solid #eee' : 'none' }}>{w}</div>
          ))}
        </div>
      )}
      {wrongWords.length > 0 && (
        <div style={{ padding: '7px 10px', background: '#fff3f3', borderRadius: 10, border: '1px solid #ffcdd2' }}>
          <span style={{ fontSize: 11, color: '#c62828', fontWeight: 700, display: 'block', marginBottom: 4 }}>❌ Words to practise:</span>
          {wrongWords.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              You typed: <strong>"{w.typed}"</strong> · Correct: <strong style={{ color: '#c62828' }}>"{w.correct}"</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function SpellingBeeGame({ saveGameScore }) {
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
  const [taskWords, setTaskWords]       = useState([]);
  const [wordIndex, setWordIndex]       = useState(0);
  const [typedInput, setTypedInput]     = useState('');
  const [wordCount, setWordCount]       = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore]               = useState(0);
  const [taskBonus, setTaskBonus]       = useState(0);
  const [feedback, setFeedback]         = useState('');

  const [correctWords, setCorrectWords] = useState([]);
  const [wrongWords, setWrongWords]     = useState([]);

  const inputRef = useRef(null);
  const cfg = (lvl) => LEVELS[lvl];

  // Run SVM whenever history changes
  useEffect(() => {
    if (taskHistory.length > 0) setSvmPrediction(svm.predict(taskHistory));
  }, [taskHistory]);

  // ─── Start task ─────────────────────────────────────────────────────────
  const startTask = (lvl, task) => {
    const { wordsPerTask } = cfg(lvl);
    const words = pickWords(lvl, wordsPerTask);
    setLevel(lvl);
    setTaskNum(task);
    setTaskWords(words);
    setWordIndex(0);
    setTypedInput('');
    setWordCount(0);
    setCorrectCount(0);
    setScore(0);
    setTaskBonus(0);
    setFeedback('');
    setCorrectWords([]);
    setWrongWords([]);
    setShowSVM(false);
    setPhase('playing');
    setTimeout(() => { speakWord(words[0].word); inputRef.current?.focus(); }, 300);
  };

  const enterLevel = (lvl) => {
    const done = tasksCompleted[lvl] || 0;
    startTask(lvl, done >= TASKS_TO_COMPLETE ? 1 : done + 1);
  };

  const goLevelSelect = () => setPhase('levelSelect');

  // ─── Apply SVM decision ──────────────────────────────────────────────────
  const handleSVMAdvance = () => {
    if (!svmPrediction) return;
    const { action } = svmPrediction;
    let newLevel = level;
    if (action === 'advance' && level < 5) { newLevel = level + 1; setUnlockedLevel(prev => Math.max(prev, newLevel)); }
    else if (action === 'drop' && level > 1) newLevel = level - 1;
    startTask(newLevel, 1);
  };

  const currentWordObj = taskWords[wordIndex] || { word: '', hint: '' };

  // ─── Check spelling ──────────────────────────────────────────────────────
  const checkSpelling = () => {
    if (!typedInput.trim()) return;
    const typed   = typedInput.trim().toUpperCase();
    const correct = currentWordObj.word.toUpperCase();
    const newCount = wordCount + 1;
    setWordCount(newCount);
    const { wordsPerTask } = cfg(level);
    const isCorrect = typed === correct;

    if (isCorrect) {
      const newScore   = score + 10;
      const newCorrect = correctCount + 1;
      setScore(newScore);
      setCorrectCount(newCorrect);
      setFeedback('🎉 Correct!');
      setCorrectWords(prev => [...prev, correct]);
      setTypedInput('');
      if (newCount >= wordsPerTask) setTimeout(() => finishTask(newScore, newCount, newCorrect), 1200);
      else setTimeout(() => {
        setWordIndex(i => i + 1);
        setFeedback('');
        setTimeout(() => { speakWord(taskWords[wordIndex + 1]?.word || ''); inputRef.current?.focus(); }, 100);
      }, 1000);
    } else {
      setFeedback(`❌ Not quite! The word was "${correct}"`);
      setWrongWords(prev => [...prev, { typed, correct }]);
      setTypedInput('');
      if (newCount >= wordsPerTask) setTimeout(() => finishTask(score, newCount, correctCount), 2000);
      else setTimeout(() => {
        setWordIndex(i => i + 1);
        setFeedback('');
        setTimeout(() => { speakWord(taskWords[wordIndex + 1]?.word || ''); inputRef.current?.focus(); }, 100);
      }, 1800);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') checkSpelling(); };

  const skipWord = () => {
    const newCount = wordCount + 1;
    setWordCount(newCount);
    setFeedback(`⏭️ Skipped — word was "${currentWordObj.word}"`);
    setWrongWords(prev => [...prev, { typed: '(skipped)', correct: currentWordObj.word }]);
    setTypedInput('');
    const { wordsPerTask } = cfg(level);
    if (newCount >= wordsPerTask) setTimeout(() => finishTask(score, newCount, correctCount), 1500);
    else setTimeout(() => {
      setWordIndex(i => i + 1);
      setFeedback('');
      setTimeout(() => { speakWord(taskWords[wordIndex + 1]?.word || ''); inputRef.current?.focus(); }, 100);
    }, 1400);
  };

  // ─── Finish task ─────────────────────────────────────────────────────────
  const finishTask = (finalScore, attempted, correct) => {
    const { wordsPerTask } = cfg(level);
    const passMark = Math.ceil(wordsPerTask * 0.6);
    const passed   = correct >= passMark;
    const maxScore = wordsPerTask * 10;

    const newHistory = [...taskHistory, { passed, score: finalScore, maxScore, level }];
    setTaskHistory(newHistory);
    const pred = svm.predict(newHistory);
    setSvmPrediction(pred);
    setShowSVM(true);

    if (!passed) {
      setTotalScore(prev => prev + finalScore);
      setScore(finalScore);
      setPhase('gameOver');
      saveGameScore?.('spelling_bee', totalScore + finalScore, level);
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
      saveGameScore?.('spelling_bee', totalScore + taskScore, level);
    } else {
      saveGameScore?.('spelling_bee', totalScore + taskScore, level);
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

  const { wordsPerTask, label, emoji, color, bg } = cfg(level);
  const passMark          = Math.ceil(wordsPerTask * 0.6);
  const tasksDoneForLevel = tasksCompleted[level] || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL SELECT
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'levelSelect') {
    return (
      <div className="game-screen">
        <h3 style={{ textAlign: 'center' }}>🐝 Spelling Bee</h3>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 8 }}>
          Complete <strong>3 tasks</strong> per level · SVM adapts your difficulty
        </p>

        {taskHistory.length >= 2 && svmPrediction && (
          <div style={{
            margin: '0 auto 14px', maxWidth: 400, padding: '10px 14px', borderRadius: 12,
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
              const isPast = t < nextTask; const isCurr = t === nextTask;
              return (
                <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isPast ? color : isCurr ? bg : '#eee',
                    border: `3px solid ${isPast || isCurr ? color : '#ddd'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: isPast ? '#fff' : isCurr ? color : '#ccc',
                  }}>{isPast ? '✓' : t}</div>
                  <span style={{ fontSize: 10, color: isPast ? color : '#aaa', fontWeight: 600 }}>
                    {isPast ? 'Done' : isCurr ? 'Next' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <WordRecap correctWords={correctWords} wrongWords={wrongWords} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />
          <p>Task score: <strong>{score}</strong>
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
          <WordRecap correctWords={correctWords} wrongWords={wrongWords} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />
          <p>Last task score: <strong>{score}</strong>
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
            {!isLastLevel && <button className="check-button" onClick={() => startTask(level + 1, 1)}>Next Level →</button>}
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
          <p>You needed <strong>{passMark}/{wordsPerTask}</strong> correct to pass</p>
          <p>You got: <strong>{correctCount}/{wordCount}</strong> correct</p>
          <p style={{ color: '#888' }}>Total score: {totalScore}</p>
          <WordRecap correctWords={correctWords} wrongWords={wrongWords} color={color} bg={bg} />
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
        <h3 style={{ margin: 0 }}>🐝 Spelling Bee</h3>
        <span style={{ padding: '4px 12px', borderRadius: 20, background: bg, border: `1px solid ${color}`, fontSize: 13, fontWeight: 700 }}>
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
          <span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>{Math.round(svmPrediction.confidence * 100)}% conf.</span>
        </div>
      )}

      {/* Task dots */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 10 }}>
        {[1, 2, 3].map(t => {
          const isPast = t < taskNum; const isCurr = t === taskNum;
          return (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isPast ? color : isCurr ? bg : '#eee',
                border: `3px solid ${isPast || isCurr ? color : '#ddd'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: isPast ? '#fff' : isCurr ? color : '#ccc',
              }}>{isPast ? '✓' : t}</div>
              <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>{isPast ? 'Done' : isCurr ? 'Now' : ''}</span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="score" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>⭐ <strong>{score}</strong></span>
        <span>📝 <strong>{wordCount}/{wordsPerTask}</strong> words</span>
        <span>✅ <strong>{correctCount}</strong> correct</span>
        <span style={{ fontSize: 12, color: '#999' }}>Need {passMark} to pass</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#eee', borderRadius: 8, height: 8, margin: '8px 0 14px', overflow: 'hidden' }}>
        <div style={{ width: `${(wordCount / wordsPerTask) * 100}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.4s ease' }} />
      </div>

      {/* Word counter bubbles */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {taskWords.map((_, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: i < wordCount
              ? (wrongWords.some(w => w.correct === taskWords[i]?.word) ? '#f44336' : color)
              : i === wordIndex ? bg : '#eee',
            border: `2px solid ${i === wordIndex ? color : i < wordCount ? 'transparent' : '#ddd'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            color: i < wordCount ? '#fff' : i === wordIndex ? color : '#ccc',
          }}>
            {i < wordCount ? (wrongWords.some(w => w.correct === taskWords[i]?.word) ? '✗' : '✓') : i + 1}
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{ background: bg, border: `2px solid ${color}44`, borderRadius: 16, padding: '14px 18px', textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#666', fontWeight: 700, marginBottom: 4 }}>💡 Hint:</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#333' }}>{currentWordObj.hint}</div>

      </div>

      {/* Audio buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
        <button className="listen-button" onClick={() => speakWord(currentWordObj.word)}>🔊 Hear Word</button>
      </div>

      {/* Input */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px', fontWeight: 600 }}>✏️ Type the spelling:</p>
        <input
          ref={inputRef}
          type="text"
          value={typedInput}
          onChange={e => setTypedInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Type the word here…"
          style={{
            width: '100%', padding: '12px 16px', fontSize: 18,
            fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase',
            borderRadius: 12, border: `2px solid ${color}55`,
            outline: 'none', boxSizing: 'border-box',
            background: '#fafafa', textAlign: 'center',
          }}
          autoComplete="off" autoCorrect="off" spellCheck={false}
        />
      </div>

      {/* Letter count hint */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#aaa', fontWeight: 700 }}>
          {currentWordObj.word.length} letters · {typedInput.length} typed
        </span>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 }}>
          {Array.from({ length: currentWordObj.word.length }).map((_, i) => (
            <div key={i} style={{
              width: 22, height: 28, borderRadius: 6,
              border: `2px solid ${i < typedInput.length ? color : '#ddd'}`,
              background: i < typedInput.length ? bg : '#f9f9f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color,
            }}>{typedInput[i] || ''}</div>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`feedback ${feedback.includes('🎉') ? 'correct' : 'incorrect'}`}>{feedback}</div>
      )}

      {correctWords.length > 0 && (
        <div style={{ margin: '8px 0', padding: '7px 10px', background: bg, borderRadius: 10, border: `1px solid ${color}` }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4 }}>✅ Correct so far:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {correctWords.map((w, i) => (
              <span key={i} style={{ padding: '3px 10px', borderRadius: 20, background: color, color: '#fff', fontSize: 12, fontWeight: 800 }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      <div className="game-controls" style={{ marginTop: 10 }}>
        <button onClick={checkSpelling} className="check-button" disabled={!typedInput.trim()}>✅ Check</button>
        <button onClick={skipWord} className="new-word-button" style={{ marginLeft: 8 }}>⏭ Skip</button>
        <button onClick={goLevelSelect} className="skip-button" style={{ marginLeft: 8 }}>🏠 Level Select</button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

export default SpellingBeeGame;