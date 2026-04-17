'use client';

import { useState, useRef, useEffect, ComponentType } from 'react';
import styles from './GamesPage.module.css';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/app/lib/supabaseClient';
import FartJump from './FartJump';
import GasBlaster from './GasBlaster';
import StinkySnake from './StinkySnake';
import TootCatcher from './TootCatcher';

interface Game {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  url: string;
  category: string;
  embed?: boolean;
  inlineComponent?: ComponentType<{ onBack: () => void }>;
}

const games: Game[] = [
  {
    id: 'fart-jump',
    name: 'Fart Jump',
    description: 'Propel your character upward by farting! Bounce off platforms, dodge crumbling ones, and fart-boost your way to the top.',
    thumbnail: '',
    url: '',
    category: 'Platformer',
    inlineComponent: FartJump,
  },
  {
    id: 'gas-blaster',
    name: 'Gas Blaster',
    description: 'Click the fart clouds before they vanish! Golden clouds score triple, but watch out for stinky purple ones.',
    thumbnail: '',
    url: '',
    category: 'Reflex',
    inlineComponent: GasBlaster,
  },
  {
    id: 'stinky-snake',
    name: 'Stinky Snake',
    description: 'Eat beans, grow longer, and leave fart clouds behind! Golden beans give 5x points but vanish fast. How long can you survive?',
    thumbnail: '',
    url: '',
    category: 'Arcade',
    inlineComponent: StinkySnake,
  },
  {
    id: 'toot-catcher',
    name: 'Toot Catcher',
    description: 'Catch falling beans, fart clouds, and peppers in your basket! Avoid bombs, build combos, and trigger Fever Mode for 2x points!',
    thumbnail: '',
    url: '',
    category: 'Reflex',
    inlineComponent: TootCatcher,
  },
  {
    id: 'legend-of-fartacus',
    name: 'The Legend of Fartacus',
    description: 'A tight-controls platformer where you fart your way to victory! Features wall-jumps, secrets, and the F.A.R.T. dynamic SFX system. Easy to learn, hard to master.',
    thumbnail: '',
    url: 'https://html-classic.itch.zone/html/13358108/index.html',
    category: 'Platformer',
  },
  {
    id: 'jetprout-joyride',
    name: 'JetProut Joyride',
    description: 'A fart-powered jetpack runner! Dodge obstacles and fly through the sky propelled by powerful gas blasts in this action-packed side-scroller.',
    thumbnail: '',
    url: 'https://html-classic.itch.zone/html/13110717/index.html',
    category: 'Action',
  },
  {
    id: 'silent-but-deadly',
    name: 'Silent but Deadly',
    description: 'A stealth puzzle game — release your fart and guide it through smell zones to make targets leave. But be careful, your fart fades fast!',
    thumbnail: '',
    url: 'https://html-classic.itch.zone/html/12661600/index.html',
    category: 'Stealth',
  },
  {
    id: 'windows-pirst',
    name: 'Windows Pirst',
    description: 'Nothing is funny without farts! A hilarious fart-themed game with quirky humor and surprising gameplay twists.',
    thumbnail: '',
    url: 'https://html-classic.itch.zone/html/2638285/index.html',
    category: 'Comedy',
  },
  {
    id: 'flappy-fart',
    name: 'Flappy Fart',
    description: 'Propel yourself through the sky with your fart',
    thumbnail: '/games/thumbnails/flappy-fart.jpg',
    url: 'https://flappy-fart.netlify.app',
    category: 'Simple',
  },
];

const GAME_EMOJIS: Record<string, string> = {
  'fart-jump': '💨',
  'gas-blaster': '💥',
  'stinky-snake': '🐍',
  'toot-catcher': '🧺',
  'legend-of-fartacus': '⚔️',
  'jetprout-joyride': '🚀',
  'silent-but-deadly': '🤫',
  'windows-pirst': '💩',
  'flappy-fart': 'F',
};

function GamesPage() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();

  const trackChallenge = (challengeId: string, periodKey: string | null) => {
    if (!user) return;
    const supabase = createClient();
    (supabase as any).rpc('increment_challenge_progress', {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_period_key: periodKey,
    }).then(() => {}).catch(() => {});
  };

  useEffect(() => {
    if (selectedGame && !selectedGame.inlineComponent && iframeRef.current) {
      const message = { type: 'AUTH_UPDATE', user: user || null };
      iframeRef.current.contentWindow?.postMessage(message, '*');
    }
  }, [user, selectedGame]);

  const handleGameSelect = (game: Game) => {
    if (game.embed === false) {
      window.open(game.url, '_blank', 'noopener,noreferrer');
      const today = new Date().toISOString().slice(0, 10);
      trackChallenge('d4', today);
      return;
    }
    setSelectedGame(game);
    const today = new Date().toISOString().slice(0, 10);
    trackChallenge('d4', today);
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleFullscreenToggle = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (!document.fullscreenElement) {
      iframe.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getGameUrl = (baseUrl: string) => baseUrl;

  if (selectedGame?.inlineComponent) {
    const InlineGame = selectedGame.inlineComponent;
    return <InlineGame onBack={handleBackToGames} />;
  }

  if (selectedGame) {
    return (
      <div className={styles.gameContainer}>
        <div className={styles.gameHeader}>
          <button onClick={handleBackToGames} className={styles.backButton}>
            ← Back to Games
          </button>
          <h1 className={styles.gameTitle}>{selectedGame.name}</h1>
          <button onClick={handleFullscreenToggle} className={styles.fullscreenButton}>
            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
        <div className={styles.gameFrame}>
          <iframe
            ref={iframeRef}
            src={getGameUrl(selectedGame.url)}
            title={selectedGame.name}
            className={styles.gameIframe}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className={styles.gameDescription}>
          <p>{selectedGame.description}</p>
          {user && (
            <p className={styles.userInfo}>
              Playing as: <strong>{user.display_name || user.username}</strong>
            </p>
          )}
          {!user && (
            <p className={styles.guestInfo}>
              Sign in to save your scores and compete on the leaderboard!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Game Center</h1>
        <p className={styles.subtitle}>Simply choose, click on a game, and play on the browser!</p>
      </div>

      <div className={styles.gamesGrid}>
        {games.map((game) => (
          <div
            key={game.id}
            className={styles.gameCard}
            onClick={() => handleGameSelect(game)}
          >
            <div className={styles.gameThumbnail}>
              <div className={styles.thumbnailPlaceholder}>
                {GAME_EMOJIS[game.id] || game.name.charAt(0)}
              </div>
            </div>
            <div className={styles.gameInfo}>
              <h3 className={styles.gameName}>{game.name}</h3>
              <p className={styles.gameDescription}>{game.description}</p>
              <span className={styles.gameCategory}>{game.category}</span>
            </div>
            <div className={styles.playButton}>
              {game.embed === false ? '↗' : '▶'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GamesPage;
