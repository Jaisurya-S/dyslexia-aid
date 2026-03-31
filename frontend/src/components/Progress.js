import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTY_LEVELS = [
  { max: 1.3, label: 'Beginner', emoji: '🌱', color: '#4caf50', bg: '#e8f5e9' },
  { max: 1.8, label: 'Easy',     emoji: '🌿', color: '#2196f3', bg: '#e3f2fd' },
  { max: 2.3, label: 'Medium',   emoji: '🌟', color: '#ff9800', bg: '#fff3e0' },
  { max: 2.8, label: 'Hard',     emoji: '🔥', color: '#9c27b0', bg: '#f3e5f5' },
  { max: 99,  label: 'Expert',   emoji: '💎', color: '#f44336', bg: '#fce4ec' },
];

const GAME_META = {
  word_jumble:   { label: 'Word Jumble',   icon: '🔀', color: '#6c63ff', bg: '#ede9fe' },
  memory_match:  { label: 'Memory Match',  icon: '🧩', color: '#3b82f6', bg: '#dbeafe' },
  spelling_bee:  { label: 'Spelling Bee',  icon: '🐝', color: '#f59e0b', bg: '#fef3c7' },
  read_aloud:    { label: 'Read Aloud',    icon: '📖', color: '#ec4899', bg: '#fce7f3' },
};

const TEST_META = {
  speech_test:    { label: 'Speech Test',   icon: '🎤', color: '#6c63ff', bg: '#ede9fe' },
  listening_test: { label: 'Listening',     icon: '👂', color: '#f59e0b', bg: '#fef3c7' },
};

const SCORE_CARDS = [
  { key: 'speech_test',    ...TEST_META.speech_test,    isPercent: true  },
  { key: 'listening_test', ...TEST_META.listening_test, isPercent: true  },
  { key: 'word_jumble',    ...GAME_META.word_jumble,    isPercent: false },
  { key: 'memory_match',   ...GAME_META.memory_match,   isPercent: false },
  { key: 'spelling_bee',   ...GAME_META.spelling_bee,   isPercent: false },
  { key: 'read_aloud',     ...GAME_META.read_aloud,     isPercent: false },
];

const ITEMS_PER_PAGE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDiffInfo = (d = 1.0) =>
  DIFFICULTY_LEVELS.find(l => d < l.max) || DIFFICULTY_LEVELS[0];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const diffPct = (d) => clamp(((d - 0.5) / 2.5) * 100, 0, 100);

const formatDate = (ds) => {
  if (!ds) return '—';
  return new Date(ds).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatType = (t = '') =>
  t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ─── Mini sparkline chart ─────────────────────────────────────────────────────
function Sparkline({ data, color, height = 48, width = 160 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none" stroke={color} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={4} fill={color} />
    </svg>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ pct, color, size = 64, strokeW = 6 }) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = clamp(pct / 100, 0, 1) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke="#e9ecef" strokeWidth={strokeW} />
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        fontSize={13} fontWeight={900} fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ pct, color }) {
  return (
    <div style={{ height: 7, background: '#e9ecef', borderRadius: 8, overflow: 'hidden', marginTop: 5 }}>
      <div style={{
        height: '100%', width: `${clamp(pct, 0, 100)}%`,
        background: color, borderRadius: 8,
        transition: 'width 1s ease',
      }} />
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────
function HistoryRow({ item, isPersonalBest, isBest, meta, isTest }) {
  const diff = getDiffInfo(item.difficulty_level || item.level || 1);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: isBest ? `${meta.color}0d` : '#fafafa',
      border: `1.5px solid ${isBest ? meta.color + '44' : '#f1f5f9'}`,
      marginBottom: 8, transition: 'transform 0.15s',
      position: 'relative', overflow: 'hidden',
    }}>
      {isBest && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: meta.color, color: '#fff',
          fontSize: 9, fontWeight: 900, padding: '2px 8px',
          borderRadius: '0 14px 0 10px', letterSpacing: 0.5,
        }}>BEST</div>
      )}

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: meta.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 20,
      }}>{meta.icon}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>
          {formatDate(item.date)} · {diff.emoji} {diff.label}
          {!isTest && item.level ? ` · Lvl ${item.level}` : ''}
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: meta.color }}>
          {isTest ? `${(item.score || item.accuracy * 100 || 0).toFixed(1)}%` : (item.score || 0)}
        </div>
        {isTest && (
          <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700 }}>score</div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontWeight: 900, fontSize: 16, color: '#475569', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, margin: 0 }}>{sub}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const Progress = () => {
  const { user } = useAuth();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('overview');   // overview | tests | games
  const [filter,  setFilter]  = useState('all');        // all | game/test type key
  const [testPage,  setTestPage]  = useState(0);
  const [gamePage,  setGamePage]  = useState(0);

  useEffect(() => {
    if (user?.user_type === 'child') fetchProgress();
    else setLoading(false);
  }, [user]);

  const fetchProgress = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: d } = await axios.get(
        `http://localhost:5000/api/progress/${user.user_id}`,
        { timeout: 6000 }
      );
      setData(d);
    } catch {
      setError('Failed to load progress. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const {
    test_results = [],
    game_scores  = [],
    highest_scores = {},
    current_difficulty = 1.0,
  } = data || {};

  const diffInfo = getDiffInfo(current_difficulty);

  const avgTest = useMemo(() =>
    test_results.length
      ? test_results.reduce((s, t) => s + (t.score || 0), 0) / test_results.length
      : 0,
    [test_results]
  );

  const avgGame = useMemo(() =>
    game_scores.length
      ? game_scores.reduce((s, g) => s + (g.score || 0), 0) / game_scores.length
      : 0,
    [game_scores]
  );

  // Trend: last 10 test scores for sparkline
  const testTrend = useMemo(() =>
    [...test_results].reverse().slice(0, 10).map(t => t.score || 0),
    [test_results]
  );

  const gameTrend = useMemo(() =>
    [...game_scores].reverse().slice(0, 10).map(g => g.score || 0),
    [game_scores]
  );

  // Personal best per game type
  const gameBests = useMemo(() => {
    const bests = {};
    game_scores.forEach(g => {
      if (!bests[g.game_type] || g.score > bests[g.game_type]) bests[g.game_type] = g.score;
    });
    return bests;
  }, [game_scores]);

  const testBests = useMemo(() => {
    const bests = {};
    test_results.forEach(t => {
      const s = t.score || 0;
      if (!bests[t.test_type] || s > bests[t.test_type]) bests[t.test_type] = s;
    });
    return bests;
  }, [test_results]);

  // Filtered + paginated history
  const filteredTests = useMemo(() =>
    filter === 'all' ? test_results : test_results.filter(t => t.test_type === filter),
    [test_results, filter]
  );

  const filteredGames = useMemo(() =>
    filter === 'all' ? game_scores : game_scores.filter(g => g.game_type === filter),
    [game_scores, filter]
  );

  const testPages  = Math.ceil(filteredTests.length / ITEMS_PER_PAGE);
  const gamePages  = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
  const visTests   = filteredTests.slice(testPage * ITEMS_PER_PAGE, (testPage + 1) * ITEMS_PER_PAGE);
  const visGames   = filteredGames.slice(gamePage * ITEMS_PER_PAGE, (gamePage + 1) * ITEMS_PER_PAGE);

  // ── Style system ─────────────────────────────────────────────────────────
  const S = {
    root: {
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      fontFamily: "'Nunito','Segoe UI',sans-serif",
      padding: '0 16px 56px',
    },
    wrap: { maxWidth: 900, margin: '0 auto' },

    hero: {
      background: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
      borderRadius: '0 0 36px 36px',
      padding: '36px 32px 36px',
      marginBottom: 28, position: 'relative', overflow: 'hidden',
    },
    heroTitle: {
      fontWeight: 900, fontSize: 'clamp(1.5rem,4vw,2.2rem)',
      color: '#fff', margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.2)',
    },
    heroSub: { color: 'rgba(255,255,255,0.82)', fontWeight: 700, fontSize: 14, marginTop: 6 },
    heroChips: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 },
    chip: {
      background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)',
      border: '1.5px solid rgba(255,255,255,0.4)',
      borderRadius: 50, padding: '7px 16px',
      color: '#fff', fontWeight: 800, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 6,
    },

    card: (color = '#6c63ff', bg = '#ede9fe') => ({
      background: bg, border: `2px solid ${color}33`,
      borderRadius: 20, padding: '18px 16px',
    }),

    tabBar: {
      display: 'flex', gap: 8, marginBottom: 20,
      background: 'var(--card-bg)', borderRadius: 50,
      padding: 5, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      width: 'fit-content',
    },
    tabBtn: (active) => ({
      padding: '8px 22px', borderRadius: 50, border: 'none',
      cursor: 'pointer', fontFamily: 'inherit',
      fontWeight: 800, fontSize: 13, transition: 'all 0.2s',
      background: active ? 'var(--primary-color)' : 'transparent',
      color: active ? '#fff' : 'var(--text-secondary)',
      boxShadow: active ? '0 4px 14px rgba(108,99,255,0.35)' : 'none',
    }),

    filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
    filterBtn: (active, color) => ({
      padding: '5px 14px', borderRadius: 50, border: `1.5px solid ${active ? color : 'var(--border-color)'}`,
      background: active ? color : 'var(--card-bg)', color: active ? '#fff' : 'var(--text-secondary)',
      fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer',
      transition: 'all 0.15s',
    }),

    sectionTitle: {
      fontSize: 17, fontWeight: 900, color: 'var(--text-primary)',
      margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8,
    },

    scoresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))',
      gap: 12, marginBottom: 24,
    },
    scoreCard: (color, bg, att) => ({
      background: att ? bg : 'var(--accent-bg)',
      border: `2px solid ${att ? color + '55' : 'var(--border-color)'}`,
      borderRadius: 18, padding: '14px 10px',
      textAlign: 'center', position: 'relative',
      transition: 'transform 0.2s',
    }),

    trendRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))',
      gap: 14, marginBottom: 24,
    },
    trendCard: {
      background: 'var(--card-bg)', borderRadius: 20, padding: '16px 18px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    },

    pagination: {
      display: 'flex', gap: 8, justifyContent: 'center',
      alignItems: 'center', marginTop: 12,
    },
    pageBtn: (active) => ({
      width: 32, height: 32, borderRadius: '50%', border: 'none',
      background: active ? 'var(--primary-color)' : 'var(--accent-bg)',
      color: active ? '#fff' : 'var(--text-secondary)',
      fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
      cursor: 'pointer', transition: 'all 0.15s',
    }),
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                  justifyContent:'center', flexDirection:'column', gap:14,
                  background:'#f8fafc', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:52, animation:'spin 1.2s linear infinite' }}>📊</div>
      <p style={{ fontWeight:800, color:'#94a3b8', fontSize:15 }}>Loading your progress…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (user?.user_type === 'parent') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                  justifyContent:'center', padding:24, background:'#f8fafc',
                  fontFamily:'Nunito,sans-serif' }}>
      <EmptyState icon="👨‍👩‍👧" title="Parent accounts don't have progress"
        sub="Visit the Parent Dashboard to see your children's progress." />
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                  justifyContent:'center', flexDirection:'column', gap:16,
                  padding:24, background:'#f8fafc', fontFamily:'Nunito,sans-serif' }}>
      <div style={{ fontSize:48 }}>😕</div>
      <p style={{ fontWeight:800, color:'#ef4444', fontSize:15, margin:0 }}>{error}</p>
      <button onClick={fetchProgress} style={{
        background:'#6c63ff', color:'#fff', border:'none',
        borderRadius:50, padding:'10px 28px',
        fontFamily:'inherit', fontWeight:800, fontSize:14,
        cursor:'pointer', boxShadow:'0 4px 14px rgba(108,99,255,0.35)',
      }}>🔄 Try Again</button>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                  justifyContent:'center', padding:24, background:'#f8fafc',
                  fontFamily:'Nunito,sans-serif' }}>
      <EmptyState icon="📊" title="No progress yet"
        sub="Complete tests and play games to see your progress here!" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        .prog-card:hover { transform: translateY(-2px); }
        .score-card-h:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .fu { animation: fadeUp 0.45s ease both; }
      `}</style>

      <div style={S.wrap}>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <div style={S.hero} className="fu">
          {['8%','55%','82%'].map((l,i) => (
            <div key={i} style={{
              position:'absolute', width:100+i*50, height:100+i*50,
              borderRadius:'50%', background:'rgba(255,255,255,0.08)',
              top:i*20-10, left:l, pointerEvents:'none',
            }}/>
          ))}
          <h1 style={S.heroTitle}>📊 My Learning Progress</h1>
          <p style={S.heroSub}>
            {test_results.length + game_scores.length > 0
              ? `${test_results.length} tests · ${game_scores.length} games played`
              : 'Start playing to track your progress!'}
          </p>
          <div style={S.heroChips}>
            <div style={S.chip}>
              {diffInfo.emoji} Level: {diffInfo.label}
            </div>
            <div style={S.chip}>
              📝 {test_results.length} tests
            </div>
            <div style={S.chip}>
              🎮 {game_scores.length} games
            </div>
            {avgTest > 0 && (
              <div style={S.chip}>🎤 Avg test: {avgTest.toFixed(1)}%</div>
            )}
          </div>
          {/* Difficulty bar */}
          <div style={{ marginTop:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between',
                          color:'rgba(255,255,255,0.8)', fontSize:11, fontWeight:800, marginBottom:5 }}>
              <span>Current difficulty</span>
              <span>{diffInfo.label} ({current_difficulty.toFixed(1)})</span>
            </div>
            <div style={{ height:8, background:'rgba(255,255,255,0.2)', borderRadius:8, overflow:'hidden' }}>
              <div style={{
                height:'100%', background:'#fff', borderRadius:8,
                width:`${diffPct(current_difficulty)}%`, transition:'width 1s ease',
              }}/>
            </div>
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div style={S.tabBar} className="fu" style2={{ animationDelay:'0.05s' }}>
          {[['overview','📋 Overview'],['tests','🎤 Test History'],['games','🎮 Game History']].map(([key,label]) => (
            <button key={key} style={S.tabBtn(tab===key)} onClick={() => { setTab(key); setFilter('all'); }}>
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <>
            {/* Summary stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',
                          gap:14, marginBottom:24 }} className="fu">
              {[
                { label:'Tests Done',    value: test_results.length,    icon:'📝', color:'#6c63ff', bg:'#ede9fe' },
                { label:'Games Played',  value: game_scores.length,     icon:'🎮', color:'#3b82f6', bg:'#dbeafe' },
                { label:'Avg Test Score',value: avgTest > 0 ? `${avgTest.toFixed(1)}%` : '—', icon:'🎯', color:'#10b981', bg:'#d1fae5' },
                { label:'Avg Game Score',value: avgGame > 0 ? Math.round(avgGame) : '—',       icon:'⭐', color:'#f59e0b', bg:'#fef3c7' },
              ].map(({ label,value,icon,color,bg }) => (
                <div key={label} className="prog-card" style={S.card(color,bg)}>
                  <div style={{ fontSize:28, marginBottom:4 }}>{icon}</div>
                  <div style={{ fontSize:24, fontWeight:900, color }}>{value}</div>
                  <div style={{ fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Trend sparklines */}
            <div style={S.trendRow} className="fu">
              {testTrend.length >= 2 && (
                <div style={S.trendCard}>
                  <p style={{ ...S.sectionTitle, fontSize:14, marginBottom:8 }}>📈 Test Score Trend</p>
                  <Sparkline data={testTrend} color="#6c63ff" />
                  <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, margin:'6px 0 0' }}>
                    Last {testTrend.length} tests
                  </p>
                </div>
              )}
              {gameTrend.length >= 2 && (
                <div style={S.trendCard}>
                  <p style={{ ...S.sectionTitle, fontSize:14, marginBottom:8 }}>📈 Game Score Trend</p>
                  <Sparkline data={gameTrend} color="#f59e0b" />
                  <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, margin:'6px 0 0' }}>
                    Last {gameTrend.length} games
                  </p>
                </div>
              )}
            </div>

            {/* Highest scores */}
            <h2 style={S.sectionTitle} className="fu">🏆 Personal Bests</h2>
            <div style={S.scoresGrid} className="fu">
              {SCORE_CARDS.map(({ key, label, icon, color, bg, isPercent }) => {
                const val = highest_scores[key] || 0;
                const att = val > 0;
                const displayVal = att
                  ? isPercent ? `${val.toFixed(1)}%` : val
                  : '—';
                const ringPct = isPercent ? val : Math.min((val / 200) * 100, 100);
                return (
                  <div key={key} className="score-card-h"
                    style={{ ...S.scoreCard(color, bg, att), cursor:'default' }}>
                    {att && (
                      <div style={{ position:'absolute', top:8, right:8, opacity:0.9 }}>
                        <ScoreRing pct={ringPct} color={color} size={34} strokeW={4} />
                      </div>
                    )}
                    <div style={{ fontSize:28, marginBottom:3 }}>{icon}</div>
                    <div style={{ fontSize:10, fontWeight:800, color:'#64748b',
                                  textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                    <div style={{ fontSize:att?20:14, fontWeight:900,
                                  color: att ? color : '#94a3b8', marginTop:4 }}>
                      {displayVal}
                    </div>
                    {!att && (
                      <div style={{ fontSize:9, color:'#cbd5e1', fontWeight:700, marginTop:2 }}>
                        Not attempted
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Per-type breakdown */}
            {game_scores.length > 0 && (
              <div className="fu">
                <h2 style={S.sectionTitle}>🎮 Game Breakdown</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12 }}>
                  {Object.entries(GAME_META).map(([key, meta]) => {
                    const played = game_scores.filter(g => g.game_type === key);
                    if (!played.length) return null;
                    const best = Math.max(...played.map(g => g.score));
                    const avg  = played.reduce((s,g) => s+g.score,0) / played.length;
                    return (
                      <div key={key} className="prog-card"
                        style={{ ...S.card(meta.color, meta.bg), cursor:'default' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                          <span style={{ fontSize:28 }}>{meta.icon}</span>
                          <div>
                            <div style={{ fontWeight:900, fontSize:14, color:'#1e293b' }}>{meta.label}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700 }}>{played.length} games played</div>
                          </div>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:'#64748b' }}>Best</span>
                          <span style={{ fontSize:13, fontWeight:900, color:meta.color }}>{best}</span>
                        </div>
                        <MiniBar pct={(best / Math.max(best, 200)) * 100} color={meta.color} />
                        <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginTop:5 }}>
                          Avg: {avg.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TEST HISTORY TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'tests' && (
          <div className="fu">
            {/* Filter buttons */}
            <div style={S.filterRow}>
              <button style={S.filterBtn(filter==='all','#6c63ff')}
                onClick={() => { setFilter('all'); setTestPage(0); }}>All</button>
              {Object.entries(TEST_META).map(([key,m]) => (
                <button key={key} style={S.filterBtn(filter===key, m.color)}
                  onClick={() => { setFilter(key); setTestPage(0); }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {filteredTests.length === 0 ? (
              <EmptyState icon="📝" title="No test results yet"
                sub="Complete speech or listening tests to see history here!" />
            ) : (
              <>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:700, marginBottom:10 }}>
                  Showing {Math.min((testPage+1)*ITEMS_PER_PAGE, filteredTests.length)} of {filteredTests.length} results
                </p>
                {visTests.map((item, i) => {
                  const meta = TEST_META[item.test_type] || { label: formatType(item.test_type), icon:'🎤', color:'#6c63ff', bg:'#ede9fe' };
                  const isBest = (item.score || 0) === testBests[item.test_type];
                  return (
                    <HistoryRow key={i} item={item} meta={meta}
                      isBest={isBest} isTest={true} />
                  );
                })}
                {testPages > 1 && (
                  <div style={S.pagination}>
                    {Array.from({ length: testPages }, (_, i) => (
                      <button key={i} style={S.pageBtn(i===testPage)}
                        onClick={() => setTestPage(i)}>{i+1}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GAME HISTORY TAB
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'games' && (
          <div className="fu">
            {/* Filter buttons */}
            <div style={S.filterRow}>
              <button style={S.filterBtn(filter==='all','#6c63ff')}
                onClick={() => { setFilter('all'); setGamePage(0); }}>All</button>
              {Object.entries(GAME_META).map(([key,m]) => (
                <button key={key} style={S.filterBtn(filter===key, m.color)}
                  onClick={() => { setFilter(key); setGamePage(0); }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {filteredGames.length === 0 ? (
              <EmptyState icon="🎮" title="No game scores yet"
                sub="Play Word Jumble, Memory Match or other games to see scores here!" />
            ) : (
              <>
                <p style={{ fontSize:12, color:'#94a3b8', fontWeight:700, marginBottom:10 }}>
                  Showing {Math.min((gamePage+1)*ITEMS_PER_PAGE, filteredGames.length)} of {filteredGames.length} results
                </p>
                {visGames.map((item, i) => {
                  const meta = GAME_META[item.game_type] || { label: formatType(item.game_type), icon:'🎮', color:'#3b82f6', bg:'#dbeafe' };
                  const isBest = item.score === gameBests[item.game_type];
                  return (
                    <HistoryRow key={i} item={item} meta={meta}
                      isBest={isBest} isTest={false} />
                  );
                })}
                {gamePages > 1 && (
                  <div style={S.pagination}>
                    {Array.from({ length: gamePages }, (_, i) => (
                      <button key={i} style={S.pageBtn(i===gamePage)}
                        onClick={() => setGamePage(i)}>{i+1}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Progress;