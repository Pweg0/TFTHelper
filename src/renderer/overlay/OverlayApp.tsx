import { useState, useEffect } from 'react';
import { PlayerPanel } from './components/PlayerPanel';

/**
 * DisplayPlayer view model — matches the shape produced by parseBoardState.
 * Defined inline to avoid importing from the main process.
 */
interface DisplayPlayer {
  summonerName: string;
  hp: number;
  maxHp: number;
  level: number;
  champions: string[];
  isLocalPlayer: boolean;
  gold?: number;
}

export default function OverlayApp(): JSX.Element {
  const [players, setPlayers] = useState<DisplayPlayer[]>([]);

  useEffect(() => {
    // Re-establish click-through state after any reload (research pitfall 6)
    window.overlayApi.toggleClickThrough(true);

    // Register board-state-update listener from main process
    window.overlayApi.onBoardStateUpdate((data) => {
      setPlayers(data as DisplayPlayer[]);
    });
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* Interactive panel zone — hover disables click-through */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 200,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          padding: '8px 4px',
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => window.overlayApi.toggleClickThrough(false)}
        onMouseLeave={() => window.overlayApi.toggleClickThrough(true)}
      >
        {players.map((player) => (
          <PlayerPanel player={player} key={player.summonerName} />
        ))}
      </div>
    </div>
  );
}
