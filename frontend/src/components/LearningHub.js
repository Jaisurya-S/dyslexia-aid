import React, { useState } from 'react';
import './LearningHub.css';

// ─── Data ──────────────────────────────────────────────────────────────────
const VIDEOS = [
  { id: 'BELlZKpi1Zs', title: 'ABC Phonics Song',      desc: 'Learn alphabet sounds A to Z',      emoji: '🎵' },
  { id: '36IBDpTRVNE', title: 'Phonics for Kids',       desc: 'Letter sounds for beginners',       emoji: '🔤' },
  { id: 'hq3yfQnllfQ', title: 'Sight Words for Kids',   desc: 'Learn common sight words',          emoji: '👀' },
  { id: 'OTO4oO-Ck7A', title: 'Short Vowel Sounds',     desc: 'A E I O U vowel practice',          emoji: '🅰️' },
  { id: 'VIiXOd5cr_c', title: 'Blending Sounds',        desc: 'How to blend letters into words',   emoji: '🔗' },
  { id: 'pHBMBjFBsQo', title: 'Reading for Beginners',  desc: 'Simple sentences and words',        emoji: '📖' },
  { id: 'DR-cfDsHCGA', title: 'Dolch Sight Words',      desc: 'Top 100 sight words practice',      emoji: '💯' },
  { id: 'yCjJyiqpAuU', title: 'CVC Words',              desc: 'Consonant Vowel Consonant words',   emoji: '🔠' },
];

const ALPHABET = [
  { letter: 'A', sound: '/a/ as in apple',    example: 'Apple, Ant, Alligator',    emoji: '🍎', color: '#ff6b6b' },
  { letter: 'B', sound: '/b/ as in ball',     example: 'Ball, Boy, Butterfly',     emoji: '⚽', color: '#4ecdc4' },
  { letter: 'C', sound: '/k/ as in cat',      example: 'Cat, Cake, Circle',        emoji: '🐱', color: '#45b7d1' },
  { letter: 'D', sound: '/d/ as in dog',      example: 'Dog, Duck, Door',          emoji: '🐶', color: '#96ceb4' },
  { letter: 'E', sound: '/e/ as in egg',      example: 'Egg, Elephant, Eagle',     emoji: '🥚', color: '#ff9a8b' },
  { letter: 'F', sound: '/f/ as in fish',     example: 'Fish, Flower, Family',     emoji: '🐟', color: '#f9ca24' },
  { letter: 'G', sound: '/g/ as in goat',     example: 'Goat, Girl, Garden',       emoji: '🐐', color: '#dda0dd' },
  { letter: 'H', sound: '/h/ as in house',    example: 'House, Hat, Horse',        emoji: '🏠', color: '#98d8c8' },
  { letter: 'I', sound: '/i/ as in igloo',    example: 'Igloo, Ink, Insect',       emoji: '🐛', color: '#74b9ff' },
  { letter: 'J', sound: '/j/ as in jump',     example: 'Jump, Jar, Jellyfish',     emoji: '🫙', color: '#f7dc6f' },
  { letter: 'K', sound: '/k/ as in kite',     example: 'Kite, Kangaroo, Key',      emoji: '🪁', color: '#82e0aa' },
  { letter: 'L', sound: '/l/ as in lion',     example: 'Lion, Lemon, Lamp',        emoji: '🦁', color: '#aed6f1' },
  { letter: 'M', sound: '/m/ as in moon',     example: 'Moon, Monkey, Mouse',      emoji: '🌙', color: '#f1948a' },
  { letter: 'N', sound: '/n/ as in nest',     example: 'Nest, Nurse, Newspaper',   emoji: '🐦', color: '#a9cce3' },
  { letter: 'O', sound: '/o/ as in octopus',  example: 'Octopus, Orange, Ostrich', emoji: '🐙', color: '#ff7675' },
  { letter: 'P', sound: '/p/ as in pig',      example: 'Pig, Pizza, Penguin',      emoji: '🐷', color: '#c39bd3' },
  { letter: 'Q', sound: '/kw/ as in queen',   example: 'Queen, Quilt, Question',   emoji: '👸', color: '#76d7c4' },
  { letter: 'R', sound: '/r/ as in rabbit',   example: 'Rabbit, Rainbow, Robot',   emoji: '🐰', color: '#f0b27a' },
  { letter: 'S', sound: '/s/ as in sun',      example: 'Sun, Star, Snake',         emoji: '☀️', color: '#85c1e9' },
  { letter: 'T', sound: '/t/ as in tiger',    example: 'Tiger, Table, Turtle',     emoji: '🐯', color: '#6bcb77' },
  { letter: 'U', sound: '/u/ as in umbrella', example: 'Umbrella, Up, Under',      emoji: '🌂', color: '#ff6b6b' },
  { letter: 'V', sound: '/v/ as in van',      example: 'Van, Violin, Volcano',     emoji: '🚐', color: '#f8c471' },
  { letter: 'W', sound: '/w/ as in window',   example: 'Window, Water, Whale',     emoji: '🐋', color: '#a9dfbf' },
  { letter: 'X', sound: '/ks/ as in box',     example: 'Box, Fox, Six',            emoji: '📦', color: '#d2b4de' },
  { letter: 'Y', sound: '/j/ as in yellow',   example: 'Yellow, Yogurt, Yo-yo',    emoji: '🪀', color: '#fad7a0' },
  { letter: 'Z', sound: '/z/ as in zebra',    example: 'Zebra, Zoo, Zipper',       emoji: '🦓', color: '#a8d8ea' },
];

const PHRASES = [
  { category: 'Greetings', emoji: '👋', color: '#ff6b6b', items: [
    { phrase: 'Good morning!',          meaning: 'Said when you meet someone in the morning' },
    { phrase: 'Good afternoon!',        meaning: 'Said when you meet someone after noon' },
    { phrase: 'How are you?',           meaning: "Asking about someone's wellbeing" },
    { phrase: 'I am fine, thank you!',  meaning: 'Responding that you are well' },
    { phrase: 'Nice to meet you!',      meaning: 'Said when meeting someone for the first time' },
  ]},
  { category: 'Classroom', emoji: '🏫', color: '#4ecdc4', items: [
    { phrase: 'May I go to the bathroom?', meaning: 'Asking permission to leave class' },
    { phrase: "I don't understand.",       meaning: 'Saying you need help' },
    { phrase: 'Can you repeat that?',      meaning: 'Asking someone to say it again' },
    { phrase: 'I need help please.',       meaning: 'Asking for assistance' },
    { phrase: 'I finished my work.',       meaning: 'Telling the teacher you are done' },
  ]},
  { category: 'Daily Life', emoji: '🌟', color: '#f7dc6f', items: [
    { phrase: 'I am hungry.',          meaning: 'Saying you want food' },
    { phrase: 'I am thirsty.',         meaning: 'Saying you want water' },
    { phrase: 'I feel tired.',         meaning: 'Saying you need rest' },
    { phrase: 'I am happy today!',     meaning: 'Expressing a positive feeling' },
    { phrase: "Let's play together!",  meaning: 'Inviting someone to play' },
  ]},
];

const WORDS = [
  { word: 'the',  type: 'article',     example: 'the cat sat',       color: '#ff6b6b' },
  { word: 'and',  type: 'conjunction', example: 'cats and dogs',      color: '#4ecdc4' },
  { word: 'is',   type: 'verb',        example: 'he is happy',        color: '#45b7d1' },
  { word: 'was',  type: 'verb',        example: 'she was here',       color: '#96ceb4' },
  { word: 'are',  type: 'verb',        example: 'we are friends',     color: '#ffeaa7' },
  { word: 'for',  type: 'preposition', example: 'a gift for you',     color: '#dda0dd' },
  { word: 'with', type: 'preposition', example: 'play with me',       color: '#98d8c8' },
  { word: 'this', type: 'pronoun',     example: 'this is my book',    color: '#f7dc6f' },
  { word: 'that', type: 'pronoun',     example: 'that is a ball',     color: '#82e0aa' },
  { word: 'have', type: 'verb',        example: 'I have a pen',       color: '#aed6f1' },
  { word: 'from', type: 'preposition', example: 'I am from here',     color: '#f1948a' },
  { word: 'but',  type: 'conjunction', example: 'small but strong',   color: '#a9cce3' },
  { word: 'not',  type: 'adverb',      example: 'do not run',         color: '#c39bd3' },
  { word: 'what', type: 'pronoun',     example: 'what is that?',      color: '#76d7c4' },
  { word: 'all',  type: 'adjective',   example: 'all the kids',       color: '#f0b27a' },
  { word: 'can',  type: 'verb',        example: 'I can do it',        color: '#85c1e9' },
];

const TABS = [
  { key: 'videos',   label: 'Videos',   emoji: '🎬' },
  { key: 'alphabet', label: 'Sounds',   emoji: '🔤' },
  { key: 'phrases',  label: 'Phrases',  emoji: '💬' },
  { key: 'words',    label: 'Words',    emoji: '📖' },
];

// ─── Speech helper ────────────────────────────────────────────────────────────
function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.8; utt.pitch = 1.1; utt.lang = 'en-US';
  const voices = window.speechSynthesis.getVoices();
  const eng = voices.find(v => v.lang.includes('en'));
  if (eng) utt.voice = eng;
  window.speechSynthesis.speak(utt);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LearningHub() {
  const [activeTab, setActiveTab] = useState('videos');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  const speak = (text) => {
    setSpeaking(true);
    speakText(text);
    setTimeout(() => setSpeaking(false), text.length * 60 + 500);
  };

  return (
    <div className="hub-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Fredoka+One&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .hub-card:hover{transform:translateY(-6px) scale(1.02)!important;box-shadow:0 16px 40px rgba(0,0,0,0.12)!important}
        .hub-letter:hover{transform:scale(1.08)!important}
        .hub-phrase:hover{transform:translateY(-3px)!important}
        .hub-word:hover{transform:scale(1.06)!important}
        .hub-video:hover{transform:translateY(-8px) scale(1.02)!important}
      `}</style>

      <div className="hub-container">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="hub-header">
          <h1>📚 Learning Hub</h1>
          <p>Videos · Sounds · Phrases · Words — all in one place!</p>
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div className="hub-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`hub-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT CARD ────────────────────────────────────────────────── */}
        <div className="hub-card">

          {/* ── VIDEOS ── */}
          {activeTab === 'videos' && (
            <>
              <h2 className="hub-section-title">🎬 Fun Learning Videos</h2>
              <p className="hub-section-desc">Click any video to watch and learn!</p>
              <div className="hub-videos-grid">
                {VIDEOS.map((v, i) => (
                  <div key={v.id} className="hub-video" onClick={() => setActiveVideo(v.id)}>
                    <div className="hub-video-thumb">
                      <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.title} />
                      <div className="hub-video-play">
                        <div className="hub-play-btn">▶</div>
                      </div>
                    </div>
                    <div className="hub-video-info">
                      <div className="hub-video-emoji">{v.emoji}</div>
                      <h3>{v.title}</h3>
                      <p>{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ALPHABET ── */}
          {activeTab === 'alphabet' && (
            <>
              <h2 className="hub-section-title">🔤 Alphabet Sounds</h2>
              <p className="hub-section-desc">Click any letter to hear its sound and see examples</p>
              <div className="hub-alphabet-grid">
                {ALPHABET.map((item) => {
                  const active = selectedLetter?.letter === item.letter;
                  return (
                    <button key={item.letter} className={`hub-letter ${active ? 'active' : ''}`}
                      style={{ borderColor: active ? item.color : item.color + '66', backgroundColor: active ? item.color : item.color + '22' }}
                      onClick={() => { setSelectedLetter(item); speak(item.letter + ' is for ' + item.example.split(',')[0].trim()); }}>
                      <div className="hub-letter-emoji" style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)' }}>
                        {item.emoji}
                      </div>
                      <span className="hub-letter-text" style={{ color: active ? '#fff' : '#222' }}>{item.letter}</span>
                      <span className="hub-letter-example" style={{ color: active ? '#fff' : '#444' }}>
                        {item.example.split(',')[0].trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedLetter && (
                <div className="hub-detail-panel" style={{ backgroundColor: selectedLetter.color + '10', borderColor: selectedLetter.color + '44' }}>
                  <div className="hub-detail-header">
                    <div className="hub-detail-emoji" style={{ backgroundColor: selectedLetter.color + '22', borderColor: selectedLetter.color }}>
                      {selectedLetter.emoji}
                    </div>
                    <div className="hub-detail-letter" style={{ color: selectedLetter.color }}>{selectedLetter.letter}</div>
                  </div>
                  <div className="hub-detail-info">
                    <p><strong>Sound:</strong> {selectedLetter.sound}</p>
                    <p><strong>Examples:</strong> {selectedLetter.example}</p>
                  </div>
                  <div className="hub-detail-actions">
                    {[
                      ['🔊 Say Letter', selectedLetter.letter + ' is for ' + selectedLetter.example.split(',')[0].trim()],
                      ['🔊 Say Sound', selectedLetter.sound],
                      ['🔊 Say Examples', selectedLetter.example],
                    ].map(([label, text]) => (
                      <button key={label} className="hub-action-btn" style={{ backgroundColor: selectedLetter.color }}
                        onClick={() => speak(text)} disabled={speaking}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── PHRASES ── */}
          {activeTab === 'phrases' && (
            <>
              <h2 className="hub-section-title">💬 Common Phrases</h2>
              <p className="hub-section-desc">Click any phrase to hear it spoken aloud</p>
              {PHRASES.map((group) => (
                <div key={group.category} className="hub-phrase-group">
                  <div className="hub-group-header" style={{ color: group.color }}>
                    <span>{group.emoji}</span>{group.category}
                  </div>
                  <div className="hub-phrases-grid">
                    {group.items.map((item) => {
                      const active = selectedPhrase?.phrase === item.phrase;
                      return (
                        <button key={item.phrase} className={`hub-phrase ${active ? 'active' : ''}`}
                          style={{ 
                            borderColor: active ? group.color : group.color + '44',
                            backgroundColor: active ? group.color + '15' : 'var(--accent-bg)'
                          }}
                          onClick={() => { setSelectedPhrase({ ...item, color: group.color }); speak(item.phrase); }}>
                          <div className="hub-phrase-text" style={{ color: group.color }}>"{item.phrase}"</div>
                          <div className="hub-phrase-meaning">{item.meaning}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {selectedPhrase && (
                <div className="hub-detail-panel" style={{ backgroundColor: selectedPhrase.color + '10', borderColor: selectedPhrase.color + '44' }}>
                  <div className="hub-detail-phrase" style={{ color: selectedPhrase.color }}>
                    "{selectedPhrase.phrase}"
                  </div>
                  <p className="hub-detail-meaning">{selectedPhrase.meaning}</p>
                  <div className="hub-detail-actions">
                    {[
                      ['🔊 Say Once', selectedPhrase.phrase],
                      ['🔊 Say Twice', selectedPhrase.phrase + '. ' + selectedPhrase.phrase],
                    ].map(([label, text]) => (
                      <button key={label} className="hub-action-btn" style={{ backgroundColor: selectedPhrase.color }}
                        onClick={() => speak(text)} disabled={speaking}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── WORDS ── */}
          {activeTab === 'words' && (
            <>
              <h2 className="hub-section-title">📖 Common Words</h2>
              <p className="hub-section-desc">Click any word to hear it and see how it's used</p>
              <div className="hub-words-grid">
                {WORDS.map((w) => {
                  const active = selectedWord?.word === w.word;
                  return (
                    <button key={w.word} className={`hub-word ${active ? 'active' : ''}`}
                      style={{ 
                        borderColor: active ? w.color : w.color + '55',
                        backgroundColor: active ? w.color : w.color + '18'
                      }}
                      onClick={() => { setSelectedWord(w); speak(w.word); }}>
                      <div className="hub-word-text" style={{ color: active ? '#fff' : '#333' }}>{w.word}</div>
                      <div className="hub-word-type" style={{ color: active ? 'rgba(255,255,255,0.8)' : '#aaa' }}>{w.type}</div>
                    </button>
                  );
                })}
              </div>
              {selectedWord && (
                <div className="hub-detail-panel" style={{ backgroundColor: selectedWord.color + '10', borderColor: selectedWord.color + '44' }}>
                  <div className="hub-detail-word" style={{ color: selectedWord.color }}>{selectedWord.word}</div>
                  <div className="hub-detail-info">
                    <p><strong>Type:</strong> {selectedWord.type}</p>
                    <p><strong>Example:</strong> "{selectedWord.example}"</p>
                  </div>
                  <div className="hub-detail-actions">
                    {[
                      ['🔊 Say Word', selectedWord.word],
                      ['🔊 Say Example', selectedWord.example],
                      ['🔊 Spell It', 'Spelling: ' + selectedWord.word.split('').join(', ')],
                    ].map(([label, text]) => (
                      <button key={label} className="hub-action-btn" style={{ backgroundColor: selectedWord.color }}
                        onClick={() => speak(text)} disabled={speaking}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── TIPS ────────────────────────────────────────────────────────── */}
        <div className="hub-tips">
          <h3>💡 Learning Tips</h3>
          <div className="hub-tips-grid">
            {[
              ['▶️', 'Watch videos daily to improve your reading and phonics skills'],
              ['🔊', 'Listen carefully and repeat each sound out loud after hearing it'],
              ['💬', 'Practice phrases every day to build confidence in speaking'],
              ['📖', 'Use common words in your own sentences to remember them better'],
            ].map(([icon, text], i) => (
              <div key={i} className="hub-tip">
                <span className="hub-tip-icon">{icon}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── VIDEO MODAL ─────────────────────────────────────────────────── */}
      {activeVideo && (
        <div className="hub-video-overlay" onClick={() => setActiveVideo(null)}>
          <div className="hub-video-modal" onClick={e => e.stopPropagation()}>
            <button className="hub-video-close" onClick={() => setActiveVideo(null)}>✕</button>
            <div className="hub-video-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                title="Learning Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}