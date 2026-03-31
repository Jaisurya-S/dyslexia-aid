import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Games.css';
import WordJumbleGame from './games/WordJumbleGame';
import MemoryMatchGame from './games/MemoryMatchGame';
import SpellingBeeGame from './games/SpellingBeeGame';
import ReadAloudGame from './games/ReadAloudGame';

const Games = () => {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);

  const games = [
    {
      id: 1,
      name: "Word Jumble",
      description: "Unscramble the words to form correct sentences",
      icon: "🔤",
      component: WordJumbleGame
    },
    {
      id: 2,
      name: "Memory Match",
      description: "Match words with their pictures",
      icon: "🧩",
      component: MemoryMatchGame
    },
    {
      id: 3,
      name: "Spelling Bee",
      description: "Spell the words you hear correctly",
      icon: "🐝",
      component: SpellingBeeGame
    },
    {
      id: 4,
      name: "Read Aloud",
      description: "Read sentences aloud and get instant feedback",
      icon: "📖",
      component: ReadAloudGame
    }
  ];

  const saveGameScore = async (gameType, score, level, timeTaken = null) => {
    try {
      await axios.post('http://localhost:5000/api/save-game-score', {
        user_id: user.user_id,
        game_type: gameType,
        score: score,
        level: level,
        time_taken: timeTaken
      });
      console.log('Final game score saved successfully');
    } catch (error) {
      console.error('Error saving game score:', error);
    }
  };

  const GameComponent = activeGame?.component;

  if (activeGame) {
    return (
      <div className="games-container">
        <button onClick={() => setActiveGame(null)} className="back-button">
          ← Back to Games
        </button>
        <GameComponent saveGameScore={saveGameScore} />
      </div>
    );
  }

  return (
    <div className="games-container">
      <h2>Learning Games</h2>
      <p className="games-subtitle">Choose a game to improve your skills!</p>
      <div className="games-grid">
        {games.map(game => (
          <div key={game.id} className="game-card" onClick={() => setActiveGame(game)}>
            <div className="game-icon">{game.icon}</div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
