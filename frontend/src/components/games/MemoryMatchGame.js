import React, { useState, useEffect, useRef } from 'react';

// ─── Simple SVM (Linear Kernel) ──────────────────────────────────────────────
// Features: [pass_rate_last3, pass_rate_last5, streak, avg_score_normalized]
// Labels: -1 = drop level, 0 = stay, 1 = advance

class SimpleSVM {
  constructor() {
    // Pre-trained weights (simulated via heuristic training data)
    // w · x + b => decision
    // Two one-vs-rest SVMs: "advance" vs rest, "drop" vs rest
    this.advanceW = [2.1, 1.8, 1.5, 0.9];
    this.advanceB = -2.8;
    this.dropW    = [-2.0, -1.7, -2.2, -0.8];
    this.dropB    = 2.5;
  }

  // Extract features from history array of {passed, score, maxScore}
  extractFeatures(history) {
    const n = history.length;
    if (n === 0) return [0.5, 0.5, 0, 0.5];

    const last3 = history.slice(-3);
    const last5 = history.slice(-5);

    const passRate3 = last3.filter(h => h.passed).length / last3.length;
    const passRate5 = last5.filter(h => h.passed).length / last5.length;

    // Streak: consecutive passes from end
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].passed) streak++;
      else break;
    }
    const streakNorm = Math.min(streak / 5, 1);

    // Average score normalized
    const avgScore = last3.reduce((s, h) => s + (h.score / Math.max(h.maxScore, 1)), 0) / last3.length;

    return [passRate3, passRate5, streakNorm, avgScore];
  }

  dot(w, x) {
    return w.reduce((s, wi, i) => s + wi * x[i], 0);
  }

  predict(history) {
    const x = this.extractFeatures(history);
    const advScore = this.dot(this.advanceW, x) + this.advanceB;
    const dropScore = this.dot(this.dropW, x) + this.dropB;

    if (advScore > 0.4) return { action: 'advance', confidence: Math.min(advScore, 1), features: x };
    if (dropScore > 0.4) return { action: 'drop',    confidence: Math.min(dropScore, 1), features: x };
    return { action: 'stay', confidence: 0.5, features: x };
  }
}

const svm = new SimpleSVM();

// ─── Constants ────────────────────────────────────────────────────────────────
const TASKS_TO_COMPLETE = 3;

const LEVELS = {
  1: { label: 'Beginner', pairs: 2, moves:  8, description: '2 pairs · Easy',         emoji: '🌱', color: '#4caf50', bg: '#e8f5e9' },
  2: { label: 'Easy',     pairs: 3, moves: 10, description: '3 pairs · Getting there', emoji: '🌿', color: '#2196f3', bg: '#e3f2fd' },
  3: { label: 'Medium',   pairs: 4, moves: 12, description: '4 pairs · Challenge',     emoji: '🌟', color: '#ff9800', bg: '#fff3e0' },
  4: { label: 'Hard',     pairs: 5, moves: 14, description: '5 pairs · Tricky',        emoji: '🔥', color: '#9c27b0', bg: '#f3e5f5' },
  5: { label: 'Expert',   pairs: 6, moves: 16, description: '6 pairs · Master it',     emoji: '💎', color: '#f44336', bg: '#fce4ec' },
};

const ALL_PAIRS = [
  { word: 'CAT',   emoji: '🐱' }, { word: 'DOG',   emoji: '🐶' },
  { word: 'SUN',   emoji: '☀️' }, { word: 'STAR',  emoji: '⭐' },
  { word: 'BOOK',  emoji: '📚' }, { word: 'BALL',  emoji: '⚽' },
  { word: 'FISH',  emoji: '🐠' }, { word: 'BIRD',  emoji: '🐦' },
  { word: 'CAKE',  emoji: '🍰' }, { word: 'TREE',  emoji: '🌳' },
  { word: 'MOON',  emoji: '🌙' }, { word: 'BEAR',  emoji: '🐻' },
  { word: 'DUCK',  emoji: '🦆' }, { word: 'FROG',  emoji: '🐸' },
  { word: 'LION',  emoji: '🦁' }, { word: 'APPLE', emoji: '🍎' },
  { word: 'HEART', emoji: '❤️' }, { word: 'HOUSE', emoji: '🏠' },
  { word: 'CAR',   emoji: '🚗' }, { word: 'SHIP',  emoji: '🚢' },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildCards(pairCount) {
  const chosen = shuffle(ALL_PAIRS).slice(0, pairCount);
  return shuffle([
    ...chosen.map((p, i) => ({ ...p, id: i,            side: 'word'  })),
    ...chosen.map((p, i) => ({ ...p, id: i + pairCount, side: 'emoji' })),
  ]);
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
      margin: '10px 0',
      padding: '12px 14px',
      borderRadius: 14,
      background: meta.bg,
      border: `2px solid ${meta.color}`,
      fontSize: 12,
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: meta.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        🤖 SVM Recommendation: {meta.icon} {meta.label}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#888' }}>
          {Math.round(confidence * 100)}% confidence
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
        {[
          { label: 'Pass rate (last 3)', val: passRate3, pct: true },
          { label: 'Pass rate (last 5)', val: passRate5, pct: true },
          { label: 'Win streak',         val: streakNorm, pct: true },
          { label: 'Avg score',          val: avgScore,   pct: true },
        ].map(({ label, val, pct }) => (
          <div key={label}>
            <div style={{ color: '#666', marginBottom: 2 }}>{label}</div>
            <div style={{ background: '#fff', borderRadius: 6, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${val * 100}%`, height: '100%', background: meta.color, borderRadius: 6, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ color: meta.color, fontWeight: 700, fontSize: 11, marginTop: 1 }}>
              {pct ? `${Math.round(val * 100)}%` : val.toFixed(2)}
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

// ─── Round Recap ──────────────────────────────────────────────────────────────
function RoundRecap({ rounds, color, bg }) {
  if (!rounds || rounds.length === 0) return null;
  return (
    <div style={{ margin: '8px 0 12px', textAlign: 'left' }}>
      {rounds.filter(r => r.passed).length > 0 && (
        <div style={{ marginBottom: 8, padding: '7px 10px', background: bg, borderRadius: 10, border: `1px solid ${color}` }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 4 }}>✅ Rounds you passed:</span>
          {rounds.filter(r => r.passed).map((r, i) => (
            <div key={i} style={{ fontSize: 12, fontWeight: 600, color: '#444', padding: '2px 0', borderBottom: i < rounds.length - 1 ? '1px solid #eee' : 'none' }}>
              Round {r.round}: {r.matched}/{r.total} pairs · {r.moves} moves · +{r.score} pts
            </div>
          ))}
        </div>
      )}
      {rounds.filter(r => !r.passed).length > 0 && (
        <div style={{ padding: '7px 10px', background: '#fff3f3', borderRadius: 10, border: '1px solid #ffcdd2' }}>
          <span style={{ fontSize: 11, color: '#c62828', fontWeight: 700, display: 'block', marginBottom: 4 }}>❌ Rounds to improve:</span>
          {rounds.filter(r => !r.passed).map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
              Round {r.round}: only {r.matched}/{r.total} pairs matched ({r.moves} moves)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MemoryMatchGame({ saveGameScore }) {
  const [level, setLevel]                   = useState(1);
  const [unlockedLevel, setUnlockedLevel]   = useState(1);
  const [tasksCompleted, setTasksCompleted] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const [phase, setPhase]         = useState('levelSelect');
  const [taskNum, setTaskNum]     = useState(1);
  const [totalScore, setTotalScore] = useState(0);

  // SVM state
  const [taskHistory, setTaskHistory]     = useState([]);   // global history for SVM
  const [svmPrediction, setSvmPrediction] = useState(null);
  const [svmAction, setSvmAction]         = useState(null); // what SVM decided this round
  const [showSVM, setShowSVM]             = useState(false);

  // Per-task state
  const [cards, setCards]     = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves]     = useState(0);
  const [score, setScore]     = useState(0);
  const [taskBonus, setTaskBonus] = useState(0);
  const [rounds, setRounds]   = useState([]);
  const [locked, setLocked]   = useState(false);

  const cfg = (lvl) => LEVELS[lvl];

  // Run SVM whenever history changes
  useEffect(() => {
    if (taskHistory.length > 0) {
      const pred = svm.predict(taskHistory);
      setSvmPrediction(pred);
    }
  }, [taskHistory]);

  // ─── Start a task ──────────────────────────────────────────────────────
  const startTask = (lvl, task) => {
    setLevel(lvl);
    setTaskNum(task);
    setCards(buildCards(cfg(lvl).pairs));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setScore(0);
    setTaskBonus(0);
    setRounds([]);
    setLocked(false);
    setSvmAction(null);
    setShowSVM(false);
    setPhase('playing');
  };

  const enterLevel = (lvl) => {
    const done = tasksCompleted[lvl] || 0;
    const nextTask = done >= TASKS_TO_COMPLETE ? 1 : done + 1;
    startTask(lvl, nextTask);
  };

  const goLevelSelect = () => setPhase('levelSelect');

  // ─── Apply SVM decision ────────────────────────────────────────────────
  const applySVMDecision = (prediction, currentLevel, currentScore, taskScore) => {
    const { action } = prediction;
    let newLevel = currentLevel;

    if (action === 'advance' && currentLevel < 5) {
      newLevel = currentLevel + 1;
      setUnlockedLevel(prev => Math.max(prev, newLevel));
    } else if (action === 'drop' && currentLevel > 1) {
      newLevel = currentLevel - 1;
    }

    setSvmAction({ action, fromLevel: currentLevel, toLevel: newLevel });
    return newLevel;
  };

  // ─── Card click ────────────────────────────────────────────────────────
  const handleCardClick = (index) => {
    if (locked || flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [a, b] = newFlipped;
      const newMoves = moves + 1;
      setMoves(newMoves);
      const { pairs, moves: maxMoves } = cfg(level);

      if (cards[a].word === cards[b].word) {
        const newMatched = [...matched, a, b];
        const newScore   = score + 10;
        setMatched(newMatched);
        setScore(newScore);
        setFlipped([]);
        setLocked(false);

        if (newMatched.length === pairs * 2 || newMoves >= maxMoves) {
          setTimeout(() => finishTask(newScore, newMoves, newMatched.length / 2), 400);
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
          if (newMoves >= maxMoves) finishTask(score, newMoves, matched.length / 2);
        }, 900);
      }
    }
  };

  // ─── Finish task ───────────────────────────────────────────────────────
  const finishTask = (finalScore, finalMoves, matchedPairs) => {
    const { pairs, moves: maxMoves } = cfg(level);
    const passMark = Math.ceil(pairs * 0.6);
    const passed   = matchedPairs >= passMark;
    const maxScore = pairs * 10;

    // Record in SVM history
    const entry = {
      passed,
      score: finalScore,
      maxScore,
      level,
      matchedPairs,
      totalPairs: pairs,
    };
    const newHistory = [...taskHistory, entry];
    setTaskHistory(newHistory);

    // Get SVM prediction on updated history
    const pred = svm.predict(newHistory);
    setSvmPrediction(pred);

    const roundEntry = { round: taskNum, matched: matchedPairs, total: pairs, moves: finalMoves, score: finalScore, passed };
    setRounds([roundEntry]);

    const bonus = passed ? Math.max(0, matchedPairs - passMark) * 5 : 0;
    const taskScore = finalScore + bonus;
    setScore(taskScore);
    setTaskBonus(bonus);
    setTotalScore(prev => prev + taskScore);

    if (passed) {
      const prevDone = tasksCompleted[level] || 0;
      const newDone  = prevDone + 1;
      setTasksCompleted(prev => ({ ...prev, [level]: newDone }));
      if (newDone >= TASKS_TO_COMPLETE && level < 5) {
        setUnlockedLevel(prev => Math.max(prev, level + 1));
      }
    }

    saveGameScore?.('memory_match', totalScore + taskScore, level);
    setShowSVM(true);
    setPhase(passed ? 'taskComplete' : 'gameOver');
  };

  const restartAll = () => {
    setTotalScore(0);
    setUnlockedLevel(1);
    setTasksCompleted({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    setTaskHistory([]);
    setSvmPrediction(null);
    setPhase('levelSelect');
  };

  const handleSVMAdvance = () => {
    if (!svmPrediction) return;
    const newLevel = applySVMDecision(svmPrediction, level, totalScore, score);
    startTask(newLevel, 1);
  };

  const { pairs, moves: maxMoves, label, emoji, color, bg } = cfg(level);
  const passMark = Math.ceil(pairs * 0.6);
  const tasksDoneForLevel = tasksCompleted[level] || 0;

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL SELECT
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === 'levelSelect') {
    return (
      <div className="game-screen">
        <h3 style={{ textAlign: 'center' }}>🃏 Memory Match</h3>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 8 }}>
          Complete <strong>3 tasks</strong> per level · SVM adapts your difficulty
        </p>

        {taskHistory.length >= 2 && svmPrediction && (
          <div style={{
            margin: '0 auto 14px',
            maxWidth: 400,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#f0f4ff',
            border: '2px solid #5c6bc0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
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
            const lvlNum   = Number(lvl);
            const isLocked = lvlNum > unlockedLevel;
            const done     = tasksCompleted[lvlNum] || 0;
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
              <button className="skip-button" onClick={restartAll} style={{ fontSize: 13 }}>
                🔄 Reset All Progress
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TASK COMPLETE
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === 'taskComplete') {
    const nextTask  = tasksDoneForLevel + 1;
    const remaining = TASKS_TO_COMPLETE - tasksDoneForLevel;
    const svmNext   = svmPrediction;

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

          <RoundRecap rounds={rounds} color={color} bg={bg} />

          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />

          <p>
            Task score: <strong>{score}</strong>
            {taskBonus > 0 && <span style={{ color: '#f90', marginLeft: 6 }}>+{taskBonus} ⚡ bonus</span>}
          </p>
          <p style={{ color: '#888' }}>Total score: <strong>{totalScore}</strong></p>

          {tasksDoneForLevel < TASKS_TO_COMPLETE && (
            <div style={{
              margin: '10px auto', padding: '10px 16px', borderRadius: 10,
              background: '#fff8e1', border: '2px solid #ffc107',
              fontWeight: 700, fontSize: 14, display: 'inline-block',
            }}>
              🎯 {remaining} more task{remaining > 1 ? 's' : ''} to unlock Level {Math.min(level + 1, 5)}!
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {/* SVM-driven next action */}
            {svmNext && svmNext.action !== 'stay' && taskHistory.length >= 2 && (
              <button
                className="check-button"
                onClick={handleSVMAdvance}
                style={{ background: '#5c6bc0', fontSize: 13 }}
              >
                🤖 SVM: {svmNext.action === 'advance' ? `⬆️ Go Level ${Math.min(level + 1, 5)}` : `⬇️ Go Level ${Math.max(level - 1, 1)}`}
              </button>
            )}
            {nextTask <= TASKS_TO_COMPLETE && (
              <button className="check-button" onClick={() => startTask(level, nextTask)}>
                ▶ Task {nextTask}
              </button>
            )}
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL COMPLETE
  // ═══════════════════════════════════════════════════════════════════════
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

          <RoundRecap rounds={rounds} color={color} bg={bg} />
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
            <button className="restart-button" onClick={() => startTask(level, 1)}>🔄 Replay</button>
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === 'gameOver') {
    return (
      <div className="game-screen">
        <div className="game-completed" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>😅</div>
          <h4>Task Failed!</h4>
          <p>Level {level} — {label} · Task {taskNum} of {TASKS_TO_COMPLETE}</p>
          <p>You needed <strong>{passMark}/{pairs}</strong> pairs to pass</p>
          <p>You matched: <strong>{matched.length / 2}/{pairs}</strong> pairs</p>
          <p style={{ color: '#888' }}>Total score: {totalScore}</p>

          <RoundRecap rounds={rounds} color={color} bg={bg} />
          <SVMInsight history={taskHistory} prediction={svmPrediction} visible={showSVM} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {svmPrediction && svmPrediction.action === 'drop' && level > 1 && (
              <button className="check-button" onClick={handleSVMAdvance} style={{ background: '#5c6bc0', fontSize: 13 }}>
                🤖 SVM: ⬇️ Try Level {level - 1}
              </button>
            )}
            <button className="check-button" onClick={() => startTask(level, taskNum)}>
              🔄 Retry Task {taskNum}
            </button>
            <button className="skip-button" onClick={goLevelSelect}>🏠 Select</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYING
  // ═══════════════════════════════════════════════════════════════════════
  const matchedPairs = matched.length / 2;
  const movesLeft = maxMoves - moves;

  return (
    <div className="game-screen">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ margin: 0 }}>🃏 Memory Match</h3>
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
        <span>🔁 <strong>{moves}/{maxMoves}</strong> moves</span>
        <span>✅ <strong>{matchedPairs}/{pairs}</strong> pairs</span>
        <span style={{ fontSize: 12, color: movesLeft <= 2 ? '#f44336' : '#999' }}>
          {movesLeft <= 3 ? `⚠️ ${movesLeft} left` : `Need ${passMark} to pass`}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#eee', borderRadius: 8, height: 8, margin: '8px 0 14px', overflow: 'hidden' }}>
        <div style={{
          width: `${(matchedPairs / pairs) * 100}%`,
          height: '100%', background: color, borderRadius: 8,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, 1fr)`,
        gap: 10,
        maxWidth: 360,
        margin: '0 auto 14px',
      }}>
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index);
          const isMatched = matched.includes(index);
          const isVisible = isFlipped || isMatched;
          return (
            <div
              key={index}
              onClick={() => handleCardClick(index)}
              style={{
                height: 72, borderRadius: 12,
                border: `2px solid ${isMatched ? color : isFlipped ? color : '#ccc'}`,
                background: isMatched ? bg : isFlipped ? '#fff' : '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: card.side === 'emoji' ? 28 : 14,
                fontWeight: 800,
                color: isMatched ? color : '#333',
                cursor: isMatched ? 'default' : 'pointer',
                transition: 'transform 0.15s, background 0.2s',
                transform: isVisible ? 'scale(1.04)' : 'scale(1)',
                userSelect: 'none',
                boxShadow: isMatched ? `0 0 0 2px ${color}44` : 'none',
              }}
              onMouseEnter={e => { if (!isMatched) e.currentTarget.style.transform = 'scale(1.07)'; }}
              onMouseLeave={e => { if (!isMatched) e.currentTarget.style.transform = isVisible ? 'scale(1.04)' : 'scale(1)'; }}
            >
              {isVisible ? (card.side === 'emoji' ? card.emoji : card.word) : '?'}
            </div>
          );
        })}
      </div>

      <div className="game-controls" style={{ marginTop: 4 }}>
        <button onClick={() => startTask(level, taskNum)} className="restart-button">🔄 Restart</button>
        <button onClick={goLevelSelect} className="skip-button" style={{ marginLeft: 8 }}>🏠 Select</button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

export default MemoryMatchGame;