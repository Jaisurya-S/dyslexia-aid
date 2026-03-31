import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────
//  SENTENCE BANK  (5 difficulty tiers × 2 modes × 5 sentences)
// ─────────────────────────────────────────────────────────────────
const SENTENCES = {
  speech: {
    1: ['The cat sleeps','Dogs love bones','Birds can fly','Fish swim fast','Sun is bright'],
    2: ['The cat sat here','I like to read','Birds fly very high','We drink clean water','Dogs run in parks'],
    3: ['The cat sat on mat','I like to read books','Birds fly high in sky','We play games every day','The sun is bright today'],
    4: ['The cat sat on the mat','I like to read good books','Birds fly high in the sky','We play fun games every day','The sun is very bright today'],
    5: ['The cat sat quietly on the mat','I like to read books every night','Birds fly very high in the blue sky','We play fun games outside every day','The bright sun shines warmly on us'],
  },
  listening: {
    1: ['Hello world','Good morning','How are you','Thank you','See you later'],
    2: ['I am very happy','She likes to sing','We go to school','He reads a book','They play outside'],
    3: ['The dog runs fast today','She sings a pretty song','We go to school early','He reads a long book','They play outside always'],
    4: ['The big dog runs very fast','She always sings a pretty song','We go to school every morning','He likes to read long books','They love to play outside daily'],
    5: ['The big brown dog runs very fast','She always loves to sing a pretty song','We go to school every single morning','He always likes to read very long books','They all love to play outside every day'],
  },
};

// ─────────────────────────────────────────────────────────────────
//  DIFFICULTY CONFIG
// ─────────────────────────────────────────────────────────────────
const DIFFICULTY_LEVELS = [
  { min: 0,   max: 1.3, label: 'Beginner', short: 'BGN', emoji: '🌱', color: '#10b981', glow: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.08)',  sentenceKey: 1 },
  { min: 1.3, max: 1.8, label: 'Easy',     short: 'EZY', emoji: '🌿', color: '#3b82f6', glow: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.08)',  sentenceKey: 2 },
  { min: 1.8, max: 2.3, label: 'Medium',   short: 'MED', emoji: '⚡', color: '#f59e0b', glow: 'rgba(245,158,11,0.25)',  bg: 'rgba(245,158,11,0.08)',  sentenceKey: 3 },
  { min: 2.3, max: 2.8, label: 'Hard',     short: 'HRD', emoji: '🔥', color: '#ef4444', glow: 'rgba(239,68,68,0.25)',   bg: 'rgba(239,68,68,0.08)',   sentenceKey: 4 },
  { min: 2.8, max: 99,  label: 'Expert',   short: 'EXP', emoji: '💎', color: '#a855f7', glow: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.08)',  sentenceKey: 5 },
];

const getDifficultyInfo = (d = 1.0) =>
  DIFFICULTY_LEVELS.find(l => d >= l.min && d < l.max) || DIFFICULTY_LEVELS[0];

// ─────────────────────────────────────────────────────────────────
//  JS SVM ENGINE
// ─────────────────────────────────────────────────────────────────
const JS_SVM = {
  supportVectors: [
    [0.1,0.3,0.0,0.3,1.2,0],[0.2,0.5,0.1,0.4,0.9,0],
    [0.3,0.6,0.2,0.5,1.1,1],[0.4,0.65,0.3,0.55,0.8,1],
    [0.5,0.72,0.4,0.65,1.3,2],[0.55,0.75,0.5,0.70,1.0,2],
    [0.65,0.80,0.6,0.78,1.2,3],[0.70,0.82,0.7,0.80,0.9,3],
    [0.80,0.90,0.8,0.88,1.4,4],[0.90,0.95,1.0,0.92,1.1,4],
  ],
  gamma: 2.5,
  rbf(x, sv) {
    const dist = x.reduce((s, xi, i) => s + (xi - sv[i]) ** 2, 0);
    return Math.exp(-this.gamma * dist);
  },
  predict(f) {
    const maxWpm = 180, maxStreak = 10;
    const x = [
      Math.min(f.wpm / maxWpm, 1),
      Math.min(f.accuracy, 1),
      Math.min(f.streak / maxStreak, 1),
      f.sessionHistory.length
        ? f.sessionHistory.slice(-5).reduce((a,b)=>a+b,0) / Math.min(f.sessionHistory.length,5)
        : 0.5,
    ];
    const scores = [0,0,0,0,0];
    for (const sv of this.supportVectors) {
      scores[sv[5]] += this.rbf(x, sv.slice(0,4)) * sv[4];
    }
    const classIdx = scores.indexOf(Math.max(...scores));
    const total = scores.reduce((a,b)=>a+b,0.0001);
    const confidence = Math.round((scores[classIdx]/total)*100);
    const difficultyScore = [0.8,1.5,2.0,2.5,3.0][classIdx];
    const histStd = this._std(f.sessionHistory.slice(-5));
    const phonemeScore = Math.min(100, Math.round(f.accuracy*90 + (1-histStd)*10));
    return { classIdx, difficultyScore, confidence, phonemeScore, scores: scores.map(s=>+(s/total*100).toFixed(1)) };
  },
  _std(arr) {
    if (!arr.length) return 0;
    const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
    return Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2,0)/arr.length);
  },
  recommend(svmResult, weakWords) {
    const tips = [
      'Focus on clear enunciation of individual words. Slow down and articulate each syllable distinctly.',
      'Build fluency by reading 3–4 word phrases in a single breath. Rhythm matters more than speed.',
      'Consonant clusters are your weak point. Practise blends like "str", "spl", "scr" in isolation.',
      'Push your pace to 90+ WPM while keeping accuracy above 80%. Speed and precision together.',
      'At expert level, focus on prosody and natural intonation. Record yourself and compare to native speakers.',
    ];
    return {
      nextLevel: ['Beginner','Easy','Medium','Hard','Expert'][svmResult.classIdx],
      tip: tips[svmResult.classIdx],
      focusWords: weakWords.slice(0,3),
    };
  },
};

// ─────────────────────────────────────────────────────────────────
//  TEXT HELPERS
// ─────────────────────────────────────────────────────────────────
const normalize = t => t.toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim();

const similarity = (a, b) => {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (!longer.length) return 1;
  let m = 0;
  for (let i = 0; i < shorter.length; i++) if (longer.includes(shorter[i])) m++;
  return m / longer.length;
};

const compareWords = (spoken, original) => {
  const sw = normalize(spoken).split(' ');
  const ow = normalize(original).split(' ');
  return ow.map((word, i) => ({
    word,
    spokenAs: sw[i] || '',
    status: sw[i] ? (similarity(sw[i], word) >= 0.8 ? 'correct' : 'wrong') : 'missing',
  }));
};

const calcAccuracy = (spoken, original) => {
  const words = compareWords(spoken, original);
  return words.filter(w => w.status === 'correct').length / words.length;
};

// ─────────────────────────────────────────────────────────────────
//  PHONEME ANALYSIS (simulated from word-level errors)
// ─────────────────────────────────────────────────────────────────
const PHONEME_GROUPS = [
  { label: 'Vowels',       key: 'vowels',      chars: 'aeiou' },
  { label: 'Plosives',     key: 'plosives',    chars: 'bpdtgk' },
  { label: 'Fricatives',   key: 'fricatives',  chars: 'fvszh' },
  { label: 'Nasals',       key: 'nasals',       chars: 'mn' },
  { label: 'Liquids',      key: 'liquids',      chars: 'lr' },
];

const analyzePhonemes = (wordResults) => {
  const groups = {};
  PHONEME_GROUPS.forEach(g => { groups[g.key] = { correct: 0, total: 0 }; });
  wordResults.forEach(w => {
    const chars = w.word.split('');
    chars.forEach(c => {
      const g = PHONEME_GROUPS.find(pg => pg.chars.includes(c));
      if (g) {
        groups[g.key].total++;
        if (w.status === 'correct') groups[g.key].correct++;
      }
    });
  });
  return PHONEME_GROUPS.map(g => ({
    label: g.label,
    key: g.key,
    score: groups[g.key].total > 0 ? Math.round((groups[g.key].correct / groups[g.key].total) * 100) : null,
    total: groups[g.key].total,
  })).filter(g => g.total > 0);
};

// ─────────────────────────────────────────────────────────────────
//  STYLES OBJECT (avoids massive inline repetition)
// ─────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Instrument+Serif:ital@0;1&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes wave     { 0%,100%{height:4px} 50%{height:28px} }
  @keyframes recPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes shimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes scaleIn  { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes glowPulse{ 0%,100%{box-shadow:0 0 0 0 var(--glow)} 50%{box-shadow:0 0 0 8px transparent} }
  @keyframes barFill  { from{width:0} to{width:var(--target-w)} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .sg  { font-family:'Space Grotesk',sans-serif; }
  .mono{ font-family:'JetBrains Mono',monospace; }
  .serif{font-family:'Instrument Serif',serif; }

  .tab-btn {
    flex:1; padding:10px 0; border:none; cursor:pointer; border-radius:10px;
    font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:13px; letter-spacing:0.02em;
    transition:all 0.25s ease; background:transparent; color:var(--text-secondary);
  }
  .tab-btn.active { color:#fff; }

  .stat-card {
    background:var(--card-bg); border-radius:14px; padding:14px 12px; text-align:center;
    border:1px solid var(--border-color); transition:border-color 0.3s, transform 0.2s;
  }
  .stat-card:hover { transform:translateY(-2px); }

  .action-btn {
    padding:11px 28px; border-radius:10px; border:none; cursor:pointer;
    font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px;
    transition:all 0.2s ease; color:#fff; letter-spacing:0.02em;
  }
  .action-btn:disabled { opacity:0.35; cursor:not-allowed; }

  .ghost-btn {
    padding:11px 18px; border-radius:10px; border:1px solid var(--border-color);
    cursor:pointer; background:transparent; color:var(--text-secondary);
    font-family:'Space Grotesk',sans-serif; font-size:13px; transition:all 0.2s;
  }
  .ghost-btn:hover { background:var(--hover-bg); color:var(--text-primary); }

  .panel { background:var(--card-bg); border:1px solid var(--border-color); border-radius:18px; padding:22px; }
  .divider { height:1px; background:var(--border-color); margin:22px 0; }
  .label { font-size:11px; font-family:'Space Grotesk',sans-serif; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.08em; }
  .chip {
    font-size:11px; padding:3px 10px; border-radius:20px;
    font-family:'Space Grotesk',sans-serif; font-weight:600;
  }

  .word-chip {
    display:inline-flex; flex-direction:column; align-items:center; gap:2px;
    border-radius:8px; padding:5px 11px; font-family:'Space Grotesk',sans-serif;
    transition:transform 0.15s; cursor:default; color:var(--text-primary);
  }
  .word-chip:hover { transform:translateY(-2px); }

  .phoneme-bar-track {
    flex:1; height:7px; background:var(--accent-bg); border-radius:4px; overflow:hidden; position:relative;
  }
  .phoneme-bar-fill {
    height:100%; border-radius:4px;
    animation:barFill 1.2s cubic-bezier(.4,0,.2,1) forwards;
  }

  .ring-svg circle { transition:stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1); }

  .svm-score-bar { height:6px; background:var(--accent-bg); border-radius:3px; overflow:hidden; }
  .svm-score-fill { height:100%; border-radius:3px; transition:width 1.4s cubic-bezier(.4,0,.2,1); }

  .sparkbar { border-radius:3px 3px 0 0; transition:height 0.4s ease; }

  .textarea-input {
    width:100%; padding:14px 16px; border-radius:12px; border:1px solid var(--border-color);
    background:var(--input-bg); color:var(--text-primary); font-size:14px;
    font-family:'Space Grotesk',sans-serif; line-height:1.6; resize:vertical; outline:none;
    transition:border-color 0.25s;
  }
  .textarea-input:focus { border-color:var(--primary-color); }
  .textarea-input::placeholder { color:var(--text-secondary); }

  .rec-zone {
    min-height:88px; padding:14px 16px; border-radius:12px;
    background:var(--input-bg); font-size:14px; line-height:1.6;
    font-family:'Space Grotesk',sans-serif; transition:border-color 0.3s; color:var(--text-primary);
  }

  .confidence-meter { position:relative; height:8px; background:var(--accent-bg); border-radius:4px; overflow:hidden; }
  .confidence-meter-fill { height:100%; border-radius:4px; transition:width 1s ease; }

  .insight-box { border-radius:12px; padding:14px 16px; color:var(--text-primary); }
  .badge { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:600; font-family:'Space Grotesk',sans-serif; }
`;

// ─────────────────────────────────────────────────────────────────
//  WAVEFORM BARS
// ─────────────────────────────────────────────────────────────────
function Waveform({ active, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, height:36 }}>
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} style={{
          width:3, borderRadius:3,
          background: active ? color : 'var(--border-color)',
          height: active ? undefined : 4,
          animation: active ? `wave 0.9s ease-in-out ${i*0.09}s infinite` : 'none',
          transition:'background 0.3s',
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SCORE RING (SVG)
// ─────────────────────────────────────────────────────────────────
function ScoreRing({ pct, color, size = 92, label }) {
  const r = size/2 - 9;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const c = size / 2;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} className="ring-svg">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border-color)" strokeWidth={8}/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform:`rotate(-90deg)`, transformOrigin:`${c}px ${c}px` }}/>
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ fontSize:size>80?20:15, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif" }}>
          {pct}%
        </span>
        {label && <span style={{ fontSize:9, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif", textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>{label}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PHONEME RADAR (simplified bar chart)
// ─────────────────────────────────────────────────────────────────
function PhonemePanel({ wordResults }) {
  const data = analyzePhonemes(wordResults);
  if (!data.length) return null;
  return (
    <div style={{ marginTop:16 }}>
      <p className="label" style={{ marginBottom:12 }}>📡 Phoneme Group Analysis</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {data.map(g => {
          const color = g.score >= 80 ? '#10b981' : g.score >= 55 ? '#f59e0b' : '#ef4444';
          return (
            <div key={g.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:72, fontSize:12, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif" }}>{g.label}</span>
              <div className="phoneme-bar-track">
                <div className="phoneme-bar-fill" style={{ width:`${g.score}%`, '--target-w':`${g.score}%`, background:color }} />
              </div>
              <span className="mono" style={{ width:36, textAlign:'right', fontSize:12, fontWeight:600, color }}>{g.score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SVM INSIGHT PANEL
// ─────────────────────────────────────────────────────────────────
function SVMInsightPanel({ svmResult, recommendation, diffInfo }) {
  if (!svmResult) return null;
  const barColors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#a855f7'];
  const labels = ['Beginner','Easy','Medium','Hard','Expert'];
  return (
    <div style={{ animation:'scaleIn 0.4s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(168,85,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🤖</div>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:'var(--text-primary)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
          SVM Adaptive Engine
        </span>
        <span style={{ marginLeft:'auto', fontSize:10, padding:'2px 8px', borderRadius:12,
          background: svmResult.source === 'backend' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.12)',
          color: svmResult.source === 'backend' ? '#60a5fa' : '#fbbf24',
          fontFamily:"'Space Grotesk',sans-serif", fontWeight:600
        }}>
          {svmResult.source === 'backend' ? '⚡ Backend' : '🔄 JS Kernel'}
        </span>
      </div>

      {/* SVM Class Probability Bars */}
      <div style={{ marginBottom:18 }}>
        <p className="label" style={{ marginBottom:10 }}>Decision Boundary Scores</p>
        {labels.map((lbl, i) => (
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
            <span style={{ width:60, fontSize:11, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif" }}>{lbl}</span>
            <div className="svm-score-bar" style={{ flex:1 }}>
              <div className="svm-score-fill" style={{
                width:`${svmResult.scores?.[i]??0}%`,
                background: barColors[i],
                opacity: i === svmResult.classIdx ? 1 : 0.35,
              }} />
            </div>
            <span className="mono" style={{ width:38, textAlign:'right', fontSize:11, fontWeight:600, color: i === svmResult.classIdx ? barColors[i] : 'var(--text-secondary)' }}>
              {svmResult.scores?.[i]??0}%
            </span>
          </div>
        ))}
      </div>

      {/* Metric Cards Row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
        {[
          { label:'Confidence',    val:`${svmResult.confidence}%`, color:diffInfo.color },
          { label:'Phoneme Score', val:`${svmResult.phonemeScore}%`, color:'#38bdf8' },
          { label:'Predicted Tier',val:labels[svmResult.classIdx], color:barColors[svmResult.classIdx] },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background:'var(--card-bg)', borderRadius:10, padding:'10px 12px',
            border:`1px solid ${color}22`,
          }}>
            <div style={{ fontSize:10, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif", marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"'Space Grotesk',sans-serif" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Confidence Meter */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span className="label">Model Confidence</span>
          <span className="mono" style={{ fontSize:11, color:diffInfo.color }}>{svmResult.confidence}%</span>
        </div>
        <div className="confidence-meter">
          <div className="confidence-meter-fill" style={{ width:`${svmResult.confidence}%`, background:`linear-gradient(90deg, ${diffInfo.color}80, ${diffInfo.color})` }} />
        </div>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="insight-box" style={{ background:diffInfo.bg, border:`1px solid ${diffInfo.color}30` }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:13 }}>💡</span>
            <span style={{ fontSize:11, color:diffInfo.color, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Personalised Recommendation
            </span>
          </div>
          <p style={{ fontSize:13, color:'var(--text-primary)', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1.6, marginBottom: recommendation.focusWords?.length ? 10 : 0 }}>
            {recommendation.tip}
          </p>
          {recommendation.focusWords?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif" }}>Revise:</span>
              {recommendation.focusWords.map(w => (
                <span key={w} className="chip" style={{ background:'var(--accent-bg)', color:'var(--text-primary)', border:'1px solid var(--border-color)' }}>
                  "{w}"
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  WORD COMPARISON
// ─────────────────────────────────────────────────────────────────
function WordComparison({ spoken, original }) {
  const words = compareWords(spoken, original);
  const correct = words.filter(w=>w.status==='correct').length;
  const sty = {
    correct: { bg:'rgba(16,185,129,0.12)', color:'#34d399', border:'rgba(16,185,129,0.25)' },
    wrong:   { bg:'rgba(239,68,68,0.12)',  color:'#f87171', border:'rgba(239,68,68,0.25)' },
    missing: { bg:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.25)', border:'rgba(255,255,255,0.08)' },
  };
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {words.map((w, i) => {
          const s = sty[w.status];
          return (
            <div key={i} className="word-chip" style={{ background:s.bg, border:`1px solid ${s.border}` }}>
              <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{w.word}</span>
              {w.status !== 'correct' && w.spokenAs && (
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>"{w.spokenAs}"</span>
              )}
              <span style={{ fontSize:10, color:s.color }}>
                {w.status==='correct' ? '✓' : w.status==='wrong' ? '✗' : '—'}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:16, fontSize:12, fontFamily:"'Space Grotesk',sans-serif", color:'rgba(255,255,255,0.45)' }}>
        <span style={{ color:'#34d399' }}>✓ {correct} correct</span>
        <span style={{ color:'#f87171' }}>✗ {words.filter(w=>w.status==='wrong').length} wrong</span>
        <span>— {words.filter(w=>w.status==='missing').length} missing</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SESSION HISTORY CHART
// ─────────────────────────────────────────────────────────────────
function SessionChart({ history }) {
  if (history.length < 2) return null;
  const MAX = 14;
  const data = history.slice(-MAX);
  const avg = data.reduce((a,b)=>a+b,0)/data.length;
  const trend = data.length >= 3
    ? (data.slice(-3).reduce((a,b)=>a+b,0)/3) - (data.slice(0,3).reduce((a,b)=>a+b,0)/3)
    : 0;
  return (
    <div className="panel" style={{ marginBottom:16, animation:'fadeUp 0.4s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span className="label">Session Progress</span>
        <div style={{ display:'flex', gap:8 }}>
          <span className="chip" style={{ background:'rgba(59,130,246,0.12)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.2)' }}>
            Avg {Math.round(avg*100)}%
          </span>
          <span className="chip" style={{
            background: trend > 0.05 ? 'rgba(16,185,129,0.12)' : trend < -0.05 ? 'rgba(239,68,68,0.12)' : 'var(--accent-bg)',
            color: trend > 0.05 ? '#34d399' : trend < -0.05 ? '#f87171' : 'var(--text-secondary)',
            border: `1px solid ${trend>0.05 ? 'rgba(16,185,129,0.2)' : trend<-0.05 ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
          }}>
            {trend > 0.05 ? '↗ Improving' : trend < -0.05 ? '↘ Declining' : '→ Stable'}
          </span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:48 }}>
        {data.map((score, i) => (
          <div key={i} style={{
            flex:1, borderRadius:'3px 3px 0 0', cursor:'default',
            minHeight:4, height:`${Math.max(8, score*100)}%`,
            background: score >= 0.7 ? `rgba(16,185,129,${0.3+score*0.6})` : `rgba(239,68,68,${0.3+(1-score)*0.5})`,
            transition:'all 0.3s ease', position:'relative',
          }} title={`Attempt ${history.length-data.length+i+1}: ${Math.round(score*100)}%`} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span style={{ fontSize:10, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif" }}>Oldest</span>
        <span style={{ fontSize:10, color:'var(--text-secondary)', fontFamily:"'Space Grotesk',sans-serif" }}>Latest</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DIFFICULTY TIMELINE (micro visual)
// ─────────────────────────────────────────────────────────────────
function DifficultyTimeline({ history }) {
  if (history.length < 3) return null;
  const data = history.slice(-10);
  const levels = data.map(d => getDifficultyInfo(d || 1.0));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      {levels.map((info, i) => (
        <div key={i} style={{
          width:20, height:20, borderRadius:6,
          background:info.color+'25', border:`1px solid ${info.color}50`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, title:info.label,
        }}>
          <span style={{ fontSize:9 }}>{info.short}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HEADER BADGE
// ─────────────────────────────────────────────────────────────────
function SVMBadge() {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
      background:'rgba(168,85,247,0.1)', borderRadius:20,
      border:'1px solid rgba(168,85,247,0.25)',
    }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#a855f7', animation:'recPulse 1.5s infinite' }} />
      <span style={{ fontSize:10, fontWeight:700, color:'#c084fc', letterSpacing:'0.09em', textTransform:'uppercase', fontFamily:"'Space Grotesk',sans-serif" }}>SVM Active</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const Tests = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab]           = useState('speech');
  const [difficulty, setDifficulty]         = useState(1.0);
  const [diffHistory, setDiffHistory]       = useState([1.0]);
  const [sentences, setSentences]           = useState([]);
  const [sentenceIdx, setSentenceIdx]       = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const [isRecording, setIsRecording]       = useState(false);
  const [spokenText, setSpokenText]         = useState('');
  const [typedText, setTypedText]           = useState('');
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [timerStart, setTimerStart]         = useState(null);
  const [elapsedMs, setElapsedMs]           = useState(0);
  const [streakCount, setStreakCount]       = useState(0);
  const [bestStreak, setBestStreak]         = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [svmResult, setSvmResult]           = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [svmLoading, setSvmLoading]         = useState(false);
  const [showAnalytics, setShowAnalytics]   = useState(false);
  const [totalWords, setTotalWords]         = useState(0);
  const [correctWords, setCorrectWords]     = useState(0);

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const diffInfo = getDifficultyInfo(difficulty);

  // ── Speech recognition setup ────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setBrowserSupport(false); return; }
    const r = new SR();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => setSpokenText(Array.from(e.results).map(x=>x[0].transcript).join(' '));
    r.onend = () => setIsRecording(false);
    r.onerror = (e) => { setIsRecording(false); if (e.error==='not-allowed') alert('Please allow microphone access.'); };
    recognitionRef.current = r;
  }, []);

  // ── Live timer while recording ───────────────────────────────
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - (timerStart||Date.now())), 200);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, timerStart]);

  // ── Load sentences ───────────────────────────────────────────
  const loadSentences = useCallback(async () => {
    const type = activeTab === 'speech' ? 'speech_test' : 'listening_test';
    try {
      const res = await axios.get(`https://dyslexia-aid.onrender.com/api/get-adaptive-content/${type}`, {
        params: { user_id: user?.user_id, difficulty }, timeout: 4000,
      });
      setSentences(res.data.content || []);
      if (res.data.difficulty_level) setDifficulty(res.data.difficulty_level);
    } catch {
      const lvl = getDifficultyInfo(difficulty);
      setSentences(SENTENCES[activeTab][lvl.sentenceKey]);
    }
  }, [activeTab, difficulty, user]);

  useEffect(() => { loadSentences(); }, [activeTab]);

  const currentSentence = sentences[sentenceIdx % Math.max(sentences.length,1)] || '…';

  // ── SVM predict ──────────────────────────────────────────────
  const runSVM = useCallback(async ({ wpm, accuracy, streak, history, weakWords }) => {
    setSvmLoading(true);
    const features = { wpm: wpm||0, accuracy, streak, sessionHistory: history };
    try {
      const res = await axios.post('https://dyslexia-aid.onrender.com/api/svm-predict', {
        user_id: user?.user_id,
        features: { wpm:features.wpm, accuracy:features.accuracy, streak:features.streak, session_history:features.sessionHistory },
      }, { timeout: 5000 });
      const data = res.data;
      const svm = { source:'backend', classIdx:data.class_index, difficultyScore:data.difficulty_score, confidence:data.confidence, phonemeScore:data.phoneme_score, scores:data.class_probabilities };
      setSvmResult(svm); setRecommendation(JS_SVM.recommend(svm, weakWords));
      if (data.difficulty_score) setDifficulty(data.difficulty_score);
    } catch {
      const svm = { ...JS_SVM.predict(features), source:'js-fallback' };
      setSvmResult(svm); setRecommendation(JS_SVM.recommend(svm, weakWords));
      setDifficulty(svm.difficultyScore);
    }
    setSvmLoading(false);
  }, [user]);

  // ── Recording ────────────────────────────────────────────────
  const startRecording = () => {
    if (!browserSupport || !recognitionRef.current) return;
    setSpokenText(''); setResult(null); setSvmResult(null);
    const now = Date.now(); setTimerStart(now); setElapsedMs(0); setIsRecording(true);
    try { recognitionRef.current.start(); } catch { setIsRecording(false); }
  };
  const stopRecording = () => { try { recognitionRef.current?.stop(); } catch {} setIsRecording(false); };

  // ── Submit speech ────────────────────────────────────────────
  const submitSpeech = async () => {
    if (!spokenText.trim()) return;
    setLoading(true);
    const duration = timerStart ? (Date.now()-timerStart)/1000 : 10;
    const wpm = (spokenText.split(' ').length / duration) * 60;
    const accuracy = calcAccuracy(spokenText, currentSentence);
    const wordResults = compareWords(spokenText, currentSentence);
    const weakWords = wordResults.filter(w=>w.status!=='correct').map(w=>w.word);
    const newHistory = [...sessionHistory, accuracy];
    setSessionHistory(newHistory);
    setTotalWords(t => t + wordResults.length);
    setCorrectWords(c => c + wordResults.filter(w=>w.status==='correct').length);

    const [speechRes] = await Promise.allSettled([
      axios.post('https://dyslexia-aid.onrender.com/api/speech-test', {
        user_id:user?.user_id, spoken_text:spokenText, original_text:currentSentence,
      }, { timeout:5000 }),
      runSVM({ wpm, accuracy, streak:streakCount, history:newHistory, weakWords }),
    ]);
    const bd = speechRes.status==='fulfilled' ? speechRes.value.data : null;
    finaliseResult('speech', bd?.accuracy??accuracy, bd?.score??accuracy*100, wpm, bd?.new_difficulty);
    setLoading(false);
  };

  // ── Submit listening ─────────────────────────────────────────
  const submitListening = async () => {
    if (!typedText.trim()) return;
    setLoading(true);
    const accuracy = calcAccuracy(typedText, currentSentence);
    const wordResults = compareWords(typedText, currentSentence);
    const weakWords = wordResults.filter(w=>w.status!=='correct').map(w=>w.word);
    const newHistory = [...sessionHistory, accuracy];
    setSessionHistory(newHistory);
    setTotalWords(t => t + wordResults.length);
    setCorrectWords(c => c + wordResults.filter(w=>w.status==='correct').length);

    const [lr] = await Promise.allSettled([
      axios.post('https://dyslexia-aid.onrender.com/api/listening-test', {
        user_id:user?.user_id, typed_text:typedText, original_text:currentSentence,
      }, { timeout:5000 }),
      runSVM({ wpm:null, accuracy, streak:streakCount, history:newHistory, weakWords }),
    ]);
    const bd = lr.status==='fulfilled' ? lr.value.data : null;
    finaliseResult('listening', bd?.accuracy??accuracy, bd?.score??accuracy*100, null, bd?.new_difficulty);
    setLoading(false);
  };

  const finaliseResult = (type, accuracy, score, wpm, newDiff) => {
    const passed = accuracy >= 0.7;
    const newStreak = passed ? streakCount+1 : 0;
    setStreakCount(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    setResult({ type, accuracy, score, wpm, passed, spoken:spokenText, typed:typedText });
    setSessionsCompleted(s=>s+1);
    if (newDiff) { setDifficulty(newDiff); setDiffHistory(h=>[...h, newDiff]); }
  };

  const playAudio = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(currentSentence);
    u.rate = 0.5; u.pitch = 0.8; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const nextSentence = () => {
    setResult(null); setSpokenText(''); setTypedText(''); setSentenceIdx(i=>i+1); setSvmResult(null); setElapsedMs(0);
  };
  const resetAll = () => {
    setResult(null); setSpokenText(''); setTypedText(''); setSentenceIdx(0); setStreakCount(0);
    setSessionsCompleted(0); setSessionHistory([]); setSvmResult(null); setDiffHistory([1.0]);
    setTotalWords(0); setCorrectWords(0); setElapsedMs(0); loadSentences();
  };
  const switchTab = (tab) => {
    setActiveTab(tab); setResult(null); setSpokenText(''); setTypedText(''); setSentenceIdx(0); setSvmResult(null);
  };

  const progressPct = sentences.length ? Math.min(100, Math.round((sentenceIdx/sentences.length)*100)) : 0;
  const avgHistScore = sessionHistory.length
    ? Math.round(sessionHistory.slice(-5).reduce((a,b)=>a+b,0)/Math.min(sessionHistory.length,5)*100) : null;
  const overallAccuracy = totalWords > 0 ? Math.round((correctWords/totalWords)*100) : null;
  const currentWordResults = result ? compareWords(
    activeTab==='speech' ? result.spoken : result.typed,
    currentSentence
  ) : [];

  const formatTime = ms => {
    const s = Math.floor(ms/1000);
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  };

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-gradient)', fontFamily:"'Space Grotesk',sans-serif", padding:'32px 16px 80px' }}>
      <style>{CSS}</style>

      {/* Background grid texture */}
      <div style={{
        position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:'radial-gradient(var(--border-color) 1px, transparent 1px)',
        backgroundSize:'28px 28px',
      }} />

      <div style={{ maxWidth:700, margin:'0 auto', position:'relative', zIndex:1 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ animation:'fadeUp 0.5s ease', marginBottom:28, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <h1 className="sg" style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>
                Adaptive Speech Lab
              </h1>
              <SVMBadge />
            </div>
            <p style={{ color:'var(--text-secondary)', fontSize:13, lineHeight:1.5 }}>
              AI-powered speech & listening assessment with real-time SVM adaptation
            </p>
            {diffHistory.length > 2 && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Difficulty trail:</span>
                <DifficultyTimeline history={diffHistory} />
              </div>
            )}
          </div>
          <button onClick={() => setShowAnalytics(a=>!a)} className="ghost-btn" style={{ flexShrink:0, marginTop:4 }}>
            {showAnalytics ? '↑ Hide' : '📊 Analytics'}
          </button>
        </div>

        {/* ── ANALYTICS PANEL ────────────────────────────────── */}
        {showAnalytics && sessionHistory.length > 0 && (
          <div className="panel" style={{ marginBottom:16, animation:'fadeUp 0.35s ease' }}>
            <p className="label" style={{ marginBottom:16 }}>Session Analytics Overview</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Sessions',     val:sessionsCompleted, color:'#e2e8f0' },
                { label:'Avg Score',    val:avgHistScore!=null?`${avgHistScore}%`:'—', color:'#38bdf8' },
                { label:'Overall Acc.', val:overallAccuracy!=null?`${overallAccuracy}%`:'—', color:'#10b981' },
                { label:'Best Streak',  val:`${bestStreak}×`, color:'#f59e0b' },
              ].map(({ label, val, color }) => (
                <div key={label} className="stat-card">
                  <div className="sg" style={{ fontSize:18, fontWeight:700, color, marginBottom:4 }}>{val}</div>
                  <div className="label">{label}</div>
                </div>
              ))}
            </div>
            <SessionChart history={sessionHistory} />
          </div>
        )}

        {/* ── KPI STRIP ──────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16, animation:'fadeUp 0.5s ease 0.1s both' }}>
          {[
            { label:'Level',   val:diffInfo.label, icon:diffInfo.emoji, color:diffInfo.color },
            { label:'Streak',  val:`${streakCount}×`, icon:'🔥', color:'#f59e0b' },
            { label:'Done',    val:sessionsCompleted, icon:'✓', color:'#10b981' },
            { label:'Avg',     val:avgHistScore!=null?`${avgHistScore}%`:'—', icon:'📈', color:'#38bdf8' },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className="stat-card" style={{ border:`1px solid ${color}18` }}>
              <div style={{ fontSize:16, marginBottom:5 }}>{icon}</div>
              <div className="sg" style={{ fontSize:15, fontWeight:700, color }}>{val}</div>
              <div className="label" style={{ marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── PROGRESS BAR ───────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ flex:1, height:3, background:'var(--border-color)', borderRadius:3, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:3,
              background:`linear-gradient(90deg, ${diffInfo.color}90, ${diffInfo.color})`,
              width:`${progressPct}%`, transition:'width 0.7s ease',
            }} />
          </div>
          <span className="mono" style={{ fontSize:10, color:'var(--text-secondary)', width:30, textAlign:'right' }}>{progressPct}%</span>
        </div>

        {/* ── TABS ───────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:6, marginBottom:18, background:'var(--accent-bg)', padding:4, borderRadius:14, border:'1px solid var(--border-color)' }}>
          {[['speech','🎤 Speech Test'],['listening','👂 Listening Test']].map(([key,label]) => (
            <button key={key} onClick={() => switchTab(key)} className={`tab-btn${activeTab===key?' active':''}`} style={{
              background: activeTab===key ? diffInfo.color : 'transparent',
              boxShadow: activeTab===key ? `0 4px 16px ${diffInfo.glow}` : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* ── MAIN CARD ──────────────────────────────────────── */}
        <div className="panel" style={{ animation:'fadeUp 0.5s ease 0.2s both' }}>

          {/* Sentence Display */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span className="label">
                {activeTab==='speech' ? '📖 Read aloud' : '👂 Listen carefully'}
              </span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span className="chip" style={{ background:diffInfo.bg, color:diffInfo.color, border:`1px solid ${diffInfo.color}35` }}>
                  {diffInfo.emoji} {diffInfo.label}
                </span>
                <span className="mono" style={{ fontSize:11, color:'var(--text-secondary)' }}>
                  #{sentenceIdx+1}
                </span>
              </div>
            </div>
            <div style={{
              padding:'18px 20px', borderRadius:14,
              background:`${diffInfo.color}0a`, border:`1px solid ${diffInfo.color}22`,
              fontFamily: activeTab==='listening' ? "'Instrument Serif',serif" : "'Space Grotesk',sans-serif",
              fontSize:19, fontWeight: activeTab==='listening' ? 400 : 600,
              color: activeTab==='listening' ? 'var(--text-secondary)' : 'var(--text-primary)',
              letterSpacing: activeTab==='listening' ? 0 : '0.01em',
              lineHeight:1.5, userSelect: activeTab==='listening' ? 'none' : 'auto',
              fontStyle: activeTab==='listening' ? 'italic' : 'normal',
            }}>
              {activeTab==='listening'
                ? '♪  Audio only — press Play to hear the sentence'
                : `"${currentSentence}"`}
            </div>
            {activeTab==='listening' && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={playAudio} className="action-btn" style={{ background:diffInfo.color, boxShadow:`0 4px 14px ${diffInfo.glow}`, padding:'9px 20px', fontSize:13 }}>
                  ▶ Play Audio
                </button>
                <button onClick={playAudio} className="ghost-btn" style={{ fontSize:13, padding:'9px 14px' }}>
                  ↺ Replay
                </button>
              </div>
            )}
          </div>

          <div className="divider" />

          {/* SPEECH MODE */}
          {activeTab==='speech' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span className="label">🎤 Voice Recording</span>
                {isRecording && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', animation:'recPulse 1s infinite' }} />
                    <span className="mono" style={{ fontSize:12, color:'#ef4444', fontWeight:600 }}>
                      {formatTime(elapsedMs)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <button onClick={isRecording ? stopRecording : startRecording} disabled={loading} className="action-btn" style={{
                  background: isRecording ? '#ef4444' : diffInfo.color,
                  boxShadow: isRecording ? '0 4px 16px rgba(239,68,68,0.4)' : `0 4px 14px ${diffInfo.glow}`,
                  padding:'10px 20px', flexShrink:0,
                  animation: isRecording ? 'glowPulse 1.5s infinite' : 'none',
                  '--glow': isRecording ? 'rgba(239,68,68,0.35)' : diffInfo.glow,
                }}>
                  {isRecording ? '⏹ Stop' : '● Record'}
                </button>
                <Waveform active={isRecording} color={isRecording ? '#ef4444' : diffInfo.color} />
              </div>

              <div className="rec-zone" style={{
                border: `1px solid ${isRecording ? '#ef4444' : 'var(--border-color)'}`,
                color: spokenText ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {spokenText || (isRecording ? '🎙 Listening… speak now' : 'Your speech will appear here automatically')}
              </div>

              {!browserSupport && (
                <div style={{ marginTop:10, padding:'8px 14px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', fontSize:12, color:'#f87171', fontFamily:"'Space Grotesk',sans-serif" }}>
                  ⚠ Speech recognition requires Chrome or Edge browser
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button onClick={submitSpeech} disabled={!spokenText.trim()||loading} className="action-btn" style={{
                  background: !spokenText.trim()||loading ? 'rgba(255,255,255,0.07)' : diffInfo.color,
                  boxShadow: !spokenText.trim()||loading ? 'none' : `0 4px 14px ${diffInfo.glow}`,
                  color: !spokenText.trim()||loading ? 'rgba(255,255,255,0.3)' : '#fff',
                }}>
                  {loading ? '⏳ Analysing…' : '→ Submit'}
                </button>
                {spokenText && <button onClick={() => { setSpokenText(''); setResult(null); }} className="ghost-btn">Clear</button>}
              </div>
            </div>
          )}

          {/* LISTENING MODE */}
          {activeTab==='listening' && (
            <div>
              <span className="label" style={{ display:'block', marginBottom:12 }}>⌨ Type what you heard</span>
              <textarea value={typedText} onChange={e=>setTypedText(e.target.value)}
                disabled={loading} rows={4} placeholder="Type the sentence exactly as you heard it…"
                className="textarea-input" />
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <button onClick={submitListening} disabled={!typedText.trim()||loading} className="action-btn" style={{
                  background: !typedText.trim()||loading ? 'rgba(255,255,255,0.07)' : diffInfo.color,
                  boxShadow: !typedText.trim()||loading ? 'none' : `0 4px 14px ${diffInfo.glow}`,
                  color: !typedText.trim()||loading ? 'rgba(255,255,255,0.3)' : '#fff',
                }}>
                  {loading ? '⏳ Analysing…' : '→ Submit'}
                </button>
                {typedText && <button onClick={() => { setTypedText(''); setResult(null); }} className="ghost-btn">Clear</button>}
              </div>
            </div>
          )}

          {/* ── RESULT SECTION ─────────────────────────────── */}
          {result && (
            <div style={{ marginTop:24, animation:'fadeUp 0.4s ease' }}>
              <div className="divider" />

              {/* Score hero */}
              <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:22 }}>
                <ScoreRing pct={Math.round(result.accuracy*100)} color={result.passed?'#10b981':'#ef4444'} label="accuracy" />
                <div style={{ flex:1 }}>
                  <h3 className="sg" style={{ fontSize:20, fontWeight:700, color:result.passed?'#34d399':'#f87171', marginBottom:8 }}>
                    {result.passed
                      ? streakCount >= 5 ? `🔥 ${streakCount} streak! Outstanding!`
                        : streakCount >= 3 ? `⚡ ${streakCount} in a row!`
                        : '✓ Well done!'
                      : '✗ Keep practising!'}
                  </h3>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    <span className="chip" style={{ background:`${result.passed?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)'}`, color:result.passed?'#34d399':'#f87171', border:`1px solid ${result.passed?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}` }}>
                      Accuracy {Math.round(result.accuracy*100)}%
                    </span>
                    {result.wpm && (
                      <span className="chip" style={{ background:'rgba(56,189,248,0.12)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.25)' }}>
                        Speed {Math.round(result.wpm)} wpm
                      </span>
                    )}
                    {svmResult && (
                      <span className="chip" style={{ background:`${getDifficultyInfo(svmResult.difficultyScore).bg}`, color:getDifficultyInfo(svmResult.difficultyScore).color, border:`1px solid ${getDifficultyInfo(svmResult.difficultyScore).color}35` }}>
                        Next: {getDifficultyInfo(svmResult.difficultyScore).label}
                      </span>
                    )}
                  </div>
                  {result.wpm && (
                    <div style={{ marginTop:10, display:'flex', gap:12 }}>
                      <ScoreRing pct={Math.min(100,Math.round(result.wpm/2))} color="#38bdf8" size={56} label="wpm" />
                      <ScoreRing pct={svmResult?.phonemeScore||0} color="#a855f7" size={56} label="phoneme" />
                      <ScoreRing pct={svmResult?.confidence||0} color="#f59e0b" size={56} label="conf." />
                    </div>
                  )}
                </div>
              </div>

              {/* Word-by-word breakdown */}
              <div style={{ marginBottom:20 }}>
                <p className="label" style={{ marginBottom:12 }}>
                  {activeTab==='speech' ? '🗣 Word-by-word breakdown' : '📝 Comparison'}
                </p>
                <WordComparison spoken={activeTab==='speech'?result.spoken:result.typed} original={currentSentence} />
                <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10, background:'var(--accent-bg)', border:'1px solid var(--border-color)' }}>
                  <span className="label">Correct: </span>
                  <span style={{ fontSize:13, color:'var(--text-primary)', fontFamily:"'Instrument Serif',serif", fontStyle:'italic', marginLeft:6 }}>"{currentSentence}"</span>
                </div>
              </div>

              {/* Phoneme Analysis */}
              {currentWordResults.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div className="divider" />
                  <PhonemePanel wordResults={currentWordResults} />
                </div>
              )}

              {/* SVM Panel */}
              <div className="divider" />
              {svmLoading
                ? <div style={{ padding:16, textAlign:'center', color:'var(--text-secondary)', fontSize:13, fontFamily:"'Space Grotesk',sans-serif" }}>
                    🤖 Running SVM engine…
                  </div>
                : <SVMInsightPanel svmResult={svmResult} recommendation={recommendation} diffInfo={diffInfo} />
              }

              {/* Actions */}
              <div style={{ display:'flex', gap:10, marginTop:22 }}>
                <button onClick={nextSentence} className="action-btn" style={{ flex:1, background:diffInfo.color, boxShadow:`0 4px 16px ${diffInfo.glow}` }}>
                  Next Sentence →
                </button>
                <button onClick={resetAll} className="ghost-btn">🔄 Reset</button>
              </div>
            </div>
          )}
        </div>

        {/* ── TIPS GRID ──────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18 }}>
          {[
            ['🎯','Speak at a steady, clear pace — accuracy first, speed second'],
            ['👂','Listen to the full audio before typing your response'],
            ['🤖','The SVM engine recalibrates difficulty after every attempt'],
            ['🔥','A streak of 3+ correct answers unlocks harder challenges'],
          ].map(([icon, tip]) => (
            <div key={tip} style={{
              display:'flex', alignItems:'flex-start', gap:10, padding:'11px 14px',
              background:'var(--accent-bg)', borderRadius:12, border:'1px solid var(--border-color)',
            }}>
              <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{icon}</span>
              <span style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{tip}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:28, opacity:0.25 }}>
          <span style={{ fontSize:11, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-secondary)' }}>
            Adaptive Speech Lab · SVM-Powered Assessment Engine
          </span>
        </div>

      </div>
    </div>
  );
};

export default Tests;