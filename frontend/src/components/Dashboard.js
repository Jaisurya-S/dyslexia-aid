import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const SCORE_CARDS = [
  { key: 'speech_test',    label: 'Speech Test',   icon: '🎤', color: '#6c63ff', bg: '#ede9fe', isPercent: true  },
  { key: 'listening_test', label: 'Listening',     icon: '👂', color: '#f59e0b', bg: '#fef3c7', isPercent: true  },
  { key: 'word_jumble',    label: 'Word Jumble',   icon: '🔀', color: '#10b981', bg: '#d1fae5', isPercent: false },
  { key: 'memory_match',   label: 'Memory Match',  icon: '🧩', color: '#3b82f6', bg: '#dbeafe', isPercent: false },
  { key: 'spelling_bee',   label: 'Spelling Bee',  icon: '🐝', color: '#f97316', bg: '#ffedd5', isPercent: false },
  { key: 'read_aloud',     label: 'Read Aloud',    icon: '📖', color: '#ec4899', bg: '#fce7f3', isPercent: false },
];

const DEFAULT_SCORES  = { speech_test:0, listening_test:0, word_jumble:0, memory_match:0, spelling_bee:0, read_aloud:0 };
const DEFAULT_METRICS = { streak:0, longest_streak:0, total_learning_time:0, today_learning:0, improvement_rate:0, blocks_earned:0, daily_goal:false, daily_goal_target:60 };

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (mins) => { if (!mins) return '0m'; const h=Math.floor(mins/60),m=mins%60; return h>0?`${h}h ${m}m`:`${m}m`; };
const today = () => new Date().toISOString().split('T')[0];

const buildCalendar = (filledBlocks=[], days=105) => {
  const result=[]; const end=new Date();
  for (let i=days-1;i>=0;i--) {
    const d=new Date(end); d.setDate(end.getDate()-i);
    const dateStr=d.toISOString().split('T')[0];
    const block=filledBlocks.find(b=>b.date===dateStr);
    result.push({ date:dateStr, dayOfWeek:d.getDay(), month:d.getMonth(), day:d.getDate(), intensity:block?.intensity||0, minutes:block?.minutes||0, filled:block?.filled||false });
  }
  return result;
};

const groupByWeek = (days) => {
  const weeks=[]; const firstDOW=days[0]?.dayOfWeek||0;
  const padded=[...Array(firstDOW).fill(null),...days];
  for (let i=0;i<padded.length;i+=7) weeks.push(padded.slice(i,i+7));
  return weeks;
};

const intensityColor = (v) => ['#e2e8f0','#bbf7d0','#4ade80','#16a34a','#14532d'][Math.min(v,4)];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreRing({ value, max=100, color, size=38, strokeW=4 }) {
  const r=( size-strokeW*2)/2, circ=2*Math.PI*r, dash=Math.min(value/max,1)*circ;
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={strokeW}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dasharray 1s ease'}}/>
    </svg>
  );
}

function MiniBar({ value, max=100, color }) {
  const pct=Math.min((value/max)*100,100);
  return (
    <div style={{height:7,background:'var(--border-color)',borderRadius:99,overflow:'hidden',marginTop:8}}>
      <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:99,transition:'width 1.2s ease'}}/>
    </div>
  );
}

function CalTooltip({ block }) {
  if (!block) return null;
  return (
    <div style={{position:'absolute',bottom:'120%',left:'50%',transform:'translateX(-50%)',
      background:'#1e293b',color:'#fff',fontSize:11,fontWeight:700,padding:'6px 10px',
      borderRadius:10,whiteSpace:'nowrap',zIndex:200,pointerEvents:'none',
      boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
      {block.date}: {block.minutes>0?`${block.minutes} min`:'No activity'}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [scores,      setScores]      = useState(DEFAULT_SCORES);
  const [metrics,     setMetrics]     = useState(DEFAULT_METRICS);
  const [rawBlocks,   setRawBlocks]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [hoveredBlock,setHoveredBlock]= useState(null);

  useEffect(() => {
    if (user?.user_type==='child') {
      fetchData();
      const onFocus=()=>fetchData();
      window.addEventListener('focus',onFocus);
      document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') fetchData(); });
      const poll=setInterval(fetchData,30000);
      return ()=>{ window.removeEventListener('focus',onFocus); clearInterval(poll); };
    } else { setLoading(false); }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`https://dyslexia-aid.onrender.com/api/dashboard-data/${user.user_id}`,{timeout:6000});
      setScores({...DEFAULT_SCORES,...(data.highest_scores||{})});
      setMetrics({...DEFAULT_METRICS,...(data.learning_metrics||{})});
      setRawBlocks(data.learning_blocks||[]);
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  };

  const handleRefresh = () => { setLoading(true); fetchData(); };

  const calendar   = useMemo(()=>buildCalendar(rawBlocks,105),[rawBlocks]);
  const weeks      = useMemo(()=>groupByWeek(calendar),[calendar]);
  const activeDays = calendar.filter(d=>d.filled).length;
  const dailyGoalTarget = metrics.daily_goal_target||60;
  const dailyPct = Math.min(Math.round((metrics.today_learning/dailyGoalTarget)*100),100);

  const monthPositions = useMemo(()=>{
    const seen={};
    weeks.forEach((week,wi)=>week.forEach(day=>{ if(day&&!seen[day.month]) seen[day.month]=wi; }));
    return seen;
  },[weeks]);

  const weekToMonthMap = Object.fromEntries(Object.entries(monthPositions).map(([m,w])=>[w,m]));

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="dash-loading">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span className="dash-loading-star">⭐</span>
      <p className="dash-loading-text">Loading your journey…</p>
    </div>
  );

  // ── Parent view ────────────────────────────────────────────────────────────
  if (user?.user_type==='parent') return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',padding:24}}>
      <div style={{textAlign:'center',maxWidth:400}}>
        <div style={{fontSize:72,marginBottom:16}}>👨‍👩‍👧</div>
        <h2 style={{fontFamily:"'Fredoka One',sans-serif",fontSize:'1.8rem',color:'var(--text-primary)',margin:'0 0 10px',fontWeight:400}}>
          Welcome, {user?.username}!
        </h2>
        <p style={{color:'var(--text-secondary)',fontWeight:700,fontSize:'1rem'}}>
          Visit the Parent Dashboard to view your children's progress.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",paddingBottom:60,maxWidth:920,margin:'0 auto'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Fredoka+One&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade-up{animation:fadeUp 0.5s ease both}
        .score-card:hover{transform:translateY(-6px) scale(1.02)!important;box-shadow:0 16px 40px rgba(0,0,0,0.13)!important}
        .cal-cell:hover{transform:scale(1.5)!important;z-index:20!important}
        .metric-chip:hover{transform:translateY(-4px)!important;box-shadow:0 12px 28px rgba(0,0,0,0.12)!important}
        .tip-row:hover{transform:translateY(-3px)!important}
      `}</style>

      {/* ── ERROR BANNER ──────────────────────────────────────────────────── */}
      {error && (
        <div style={{background:'#fff5f5',border:'2px solid #fca5a5',borderRadius:18,padding:'12px 20px',
          marginBottom:22,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <span style={{fontSize:13,fontWeight:800,color:'#dc2626'}}>⚠️ Could not refresh data. Showing last known values.</span>
          <button onClick={handleRefresh} style={{background:'#dc2626',color:'#fff',border:'none',
            borderRadius:50,padding:'6px 16px',fontFamily:'inherit',fontWeight:800,fontSize:12,cursor:'pointer'}}>
            Retry
          </button>
        </div>
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="fade-up" style={{
        background:'linear-gradient(135deg,#667eea 0%,#a78bfa 50%,#f093fb 100%)',
        borderRadius:'0 0 40px 40px',padding:'38px 32px 46px',marginBottom:32,
        position:'relative',overflow:'hidden',
        boxShadow:'0 12px 40px rgba(102,126,234,0.35)'}}>

        {/* decorative blobs */}
        {[{s:180,t:-30,l:'8%',o:0.07},{s:240,t:20,l:'55%',o:0.06},{s:140,t:10,l:'82%',o:0.08}].map((b,i)=>(
          <div key={i} style={{position:'absolute',width:b.s,height:b.s,borderRadius:'50%',
            background:`rgba(255,255,255,${b.o})`,top:b.t,left:b.l,pointerEvents:'none'}}/>
        ))}

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,position:'relative'}}>
          <div>
            <h1 style={{fontFamily:"'Fredoka One',sans-serif",fontWeight:400,
              fontSize:'clamp(1.7rem,4vw,2.5rem)',color:'#fff',margin:'0 0 6px',
              textShadow:'0 2px 16px rgba(0,0,0,0.18)',letterSpacing:'0.5px'}}>
              {metrics.streak>0?'🔥':'👋'} Hey, {user?.username}!
            </h1>
            <p style={{color:'rgba(255,255,255,0.88)',fontWeight:700,fontSize:15,margin:'0 0 22px'}}>
              {metrics.total_learning_time>0
                ?`You've spent ${formatTime(metrics.total_learning_time)} learning — amazing! 🌟`
                :'Start your learning adventure today! 🚀'}
            </p>
          </div>
          <button onClick={handleRefresh} style={{
            background:'rgba(255,255,255,0.2)',border:'2px solid rgba(255,255,255,0.45)',
            borderRadius:50,padding:'8px 16px',cursor:'pointer',color:'#fff',
            fontFamily:'inherit',fontWeight:800,fontSize:13,backdropFilter:'blur(8px)',
            flexShrink:0,transition:'all 0.2s ease'}}>
            🔄 Refresh
          </button>
        </div>

        {/* stat chips */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',position:'relative'}}>
          {[
            ['🔥',`${metrics.streak} day streak`],
            ['🏆',`Best: ${metrics.longest_streak} days`],
            ['📅',`${activeDays} active days`],
            ['📈',`+${metrics.improvement_rate||0}% improved`],
          ].map(([icon,label])=>(
            <div key={label} style={{background:'rgba(255,255,255,0.22)',backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 18px',
              color:'#fff',fontWeight:800,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              {icon} {label}
            </div>
          ))}
        </div>

        {/* daily goal bar */}
        <div style={{marginTop:22,position:'relative'}}>
          <div style={{display:'flex',justifyContent:'space-between',
            color:'rgba(255,255,255,0.9)',fontSize:12,fontWeight:800,marginBottom:7}}>
            <span>🎯 Today's Goal</span>
            <span>{metrics.daily_goal?'✅ Goal met!':`${metrics.today_learning||0} / ${dailyGoalTarget} min`}</span>
          </div>
          <div style={{background:'rgba(255,255,255,0.2)',borderRadius:99,height:13,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${dailyPct}%`,background:'#fff',borderRadius:99,
              transition:'width 1.2s ease',boxShadow:'0 0 12px rgba(255,255,255,0.7)'}}/>
          </div>
        </div>
      </div>

      {/* ── HIGHEST SCORES ────────────────────────────────────────────────── */}
      <div className="fade-up" style={{animationDelay:'0.08s',marginBottom:30}}>
        <h2 style={{fontFamily:"'Fredoka One',sans-serif",fontWeight:400,fontSize:'1.4rem',
          color:'var(--text-primary)',margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>
          🏆 Highest Scores
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(138px,1fr))',gap:14}}>
          {SCORE_CARDS.map(({key,label,icon,color,bg,isPercent})=>{
            const val=scores[key]||0, att=val>0;
            const displayVal=att?(isPercent?`${val.toFixed(1)}%`:val):'—';
            const ringPct=isPercent?val:Math.min((val/200)*100,100);
            return (
              <div key={key} className="score-card" style={{
                background:att?bg:'var(--accent-bg)',
                border:`2.5px solid ${att?color+'55':'var(--border-color)'}`,
                borderRadius:24,padding:'18px 14px',textAlign:'center',
                position:'relative',transition:'transform 0.22s,box-shadow 0.22s',cursor:'default'}}>
                {att&&(
                  <div style={{position:'absolute',top:10,right:10}}>
                    <ScoreRing value={ringPct} color={color} size={38} strokeW={4}/>
                  </div>
                )}
                <span style={{fontSize:30,marginBottom:6,display:'block'}}>{icon}</span>
                <span style={{fontSize:10,fontWeight:800,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:0.8,display:'block'}}>{label}</span>
                <span style={{fontSize:att?22:15,fontWeight:900,color:att?color:'var(--text-secondary)',display:'block',marginTop:5}}>{displayVal}</span>
                {!att&&<span style={{fontSize:10,color:'var(--text-secondary)',fontWeight:700,marginTop:3,display:'block'}}>Not attempted</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── METRICS ───────────────────────────────────────────────────────── */}
      <div className="fade-up" style={{animationDelay:'0.16s',marginBottom:30}}>
        <h2 style={{fontFamily:"'Fredoka One',sans-serif",fontWeight:400,fontSize:'1.4rem',
          color:'var(--text-primary)',margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>
          📊 Learning Metrics
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14}}>
          {[
            {color:'#6c63ff',bg:'#ede9fe',label:'Total Time',   value:formatTime(metrics.total_learning_time), bar:metrics.total_learning_time, max:600, desc:'Keep learning every day!'},
            {color:'#f59e0b',bg:'#fef3c7',label:'Current Streak',value:`🔥 ${metrics.streak}`,                bar:metrics.streak, max:Math.max(30,metrics.longest_streak), desc:`Best: ${metrics.longest_streak} days`},
            {color:'#10b981',bg:'#d1fae5',label:'Improvement',  value:`+${metrics.improvement_rate||0}%`,     bar:metrics.improvement_rate||0, max:100, desc:(metrics.improvement_rate||0)>0?'Great progress!':'Complete tests to track'},
            {color:'#3b82f6',bg:'#dbeafe',label:"Today's Progress",value:`${dailyPct}%`,                      bar:dailyPct, max:100, desc:metrics.daily_goal?'🎉 Daily goal met!':`${metrics.today_learning||0}/${dailyGoalTarget} min`},
          ].map(({color,bg,label,value,bar,max,desc})=>(
            <div key={label} className="metric-chip" style={{
              background:bg,border:`2.5px solid ${color}33`,borderRadius:22,padding:'20px 18px',
              transition:'transform 0.22s,box-shadow 0.22s'}}>
              <p style={{fontSize:10,fontWeight:800,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:0.8,margin:0}}>{label}</p>
              <p style={{fontSize:26,fontWeight:900,color,margin:'5px 0 0',lineHeight:1.1}}>{value}</p>
              <MiniBar value={bar} max={max} color={color}/>
              <p style={{fontSize:12,color:'var(--text-secondary)',fontWeight:700,marginTop:6,margin:'6px 0 0'}}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTIVITY CALENDAR ─────────────────────────────────────────────── */}
      <div className="fade-up" style={{animationDelay:'0.24s',marginBottom:30}}>
        <h2 style={{fontFamily:"'Fredoka One',sans-serif",fontWeight:400,fontSize:'1.4rem',
          color:'var(--text-primary)',margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>
          📅 Activity Calendar
        </h2>
        <div style={{background:'var(--card-bg)',borderRadius:26,padding:'24px 22px',
          boxShadow:'0 4px 28px rgba(0,0,0,0.07)',border:'2px solid var(--border-color)',overflowX:'auto'}}>

          {/* month labels */}
          <div style={{display:'flex',gap:3,marginBottom:7,paddingLeft:20}}>
            {weeks.map((_,wi)=>(
              <div key={wi} style={{width:14,flexShrink:0,fontSize:9,fontWeight:800,textAlign:'center',
                color:weekToMonthMap[wi]!==undefined?'var(--text-primary)':'transparent'}}>
                {weekToMonthMap[wi]!==undefined?MONTH_NAMES[Number(weekToMonthMap[wi])]:'·'}
              </div>
            ))}
          </div>

          <div style={{display:'flex',gap:6}}>
            {/* day labels */}
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {DAY_LABELS.map((d,i)=>(
                <div key={i} style={{height:14,fontSize:9,color:'var(--text-secondary)',fontWeight:800,
                  lineHeight:'14px',width:14,textAlign:'right'}}>
                  {i%2===1?d:''}
                </div>
              ))}
            </div>

            {/* grid */}
            <div style={{display:'flex',gap:3,position:'relative'}}>
              {weeks.map((week,wi)=>(
                <div key={wi} style={{display:'flex',flexDirection:'column',gap:3}}>
                  {Array(7).fill(null).map((_,di)=>{
                    const cell=week[di];
                    if (!cell) return <div key={di} style={{width:14,height:14,borderRadius:3,flexShrink:0}}/>;
                    const isToday=cell.date===today();
                    return (
                      <div key={di} className="cal-cell" style={{
                        width:14,height:14,borderRadius:3,flexShrink:0,cursor:'pointer',
                        background:intensityColor(cell.intensity),
                        border:isToday?'2px solid #6c63ff':'none',
                        transition:'transform 0.12s',position:'relative'}}
                        onMouseEnter={()=>setHoveredBlock({...cell,wi,di})}
                        onMouseLeave={()=>setHoveredBlock(null)}>
                        {hoveredBlock?.date===cell.date&&<CalTooltip block={cell}/>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* legend */}
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:16,justifyContent:'flex-end'}}>
            <span style={{fontSize:11,color:'var(--text-secondary)',fontWeight:800}}>Less</span>
            {[0,1,2,3,4].map(v=>(
              <div key={v} style={{width:13,height:13,borderRadius:3,background:intensityColor(v)}}/>
            ))}
            <span style={{fontSize:11,color:'var(--text-secondary)',fontWeight:800}}>More</span>
          </div>

          {/* summary */}
          <div style={{marginTop:14,paddingTop:14,borderTop:'2px solid var(--border-color)',display:'flex',gap:24,flexWrap:'wrap'}}>
            {[
              ['📅',`${activeDays} active days`,'#6c63ff'],
              ['⏱️',`${formatTime(metrics.total_learning_time)} total`,'#10b981'],
              ['🧱',`${metrics.blocks_earned||0} blocks earned`,'#f59e0b'],
            ].map(([icon,label,color])=>(
              <span key={label} style={{fontSize:13,fontWeight:800,color}}>{icon} {label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── TIPS ──────────────────────────────────────────────────────────── */}
      <div className="fade-up" style={{animationDelay:'0.32s'}}>
        <h2 style={{fontFamily:"'Fredoka One',sans-serif",fontWeight:400,fontSize:'1.4rem',
          color:'var(--text-primary)',margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>
          💡 Tips to Level Up
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:13}}>
          {[
            ['🎯','#6c63ff','#ede9fe','Complete 60 min today',   `You need ${Math.max(0,dailyGoalTarget-(metrics.today_learning||0))} more minutes to hit your daily goal!`],
            ['🔥','#f59e0b','#fef3c7','Keep your streak alive',  `Log in and learn every day. Your best was ${metrics.longest_streak} days!`],
            ['🏆','#10b981','#d1fae5','Beat your top scores',    'Try each game again — you can always improve your personal best.'],
            ['📖','#3b82f6','#dbeafe','30 min = 1 block',        'Every 30 minutes of learning earns one green block on your calendar.'],
          ].map(([icon,color,bg,title,desc])=>(
            <div key={title} className="tip-row" style={{
              background:bg,border:`2px solid ${color}44`,borderRadius:20,
              padding:'16px 18px',display:'flex',gap:12,alignItems:'flex-start',
              transition:'transform 0.2s'}}>
              <span style={{fontSize:26,flexShrink:0}}>{icon}</span>
              <div>
                <p style={{fontWeight:900,fontSize:13,color:'var(--text-primary)',margin:'0 0 4px'}}>{title}</p>
                <p style={{fontSize:12,color:'var(--text-secondary)',fontWeight:700,margin:0,lineHeight:1.55}}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
