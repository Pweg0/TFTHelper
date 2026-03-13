import { useState, useEffect } from 'react';

interface OverlayState {
  gold: number;
  level: number;
  gameTime: number;
  playerNames: string[];
  localPlayerName: string;
}

const TEXT_SHADOW = '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 6px rgba(0,0,0,0.7)';

const textStyle: React.CSSProperties = {
  fontFamily: '"Segoe UI", Arial, sans-serif',
  fontWeight: 600,
  color: 'white',
  textShadow: TEXT_SHADOW,
  lineHeight: 1.4,
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function OverlayApp(): JSX.Element {
  const [state, setState] = useState<OverlayState | null>(null);

  useEffect(() => {
    window.overlayApi.toggleClickThrough(true);
    window.overlayApi.onOverlayStateUpdate((data) => {
      setState(data as OverlayState);
    });
  }, []);

  if (!state) {
    return <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} />;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'fixed',
          right: 8,
          top: 8,
          width: 180,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '8px',
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => window.overlayApi.toggleClickThrough(false)}
        onMouseLeave={() => window.overlayApi.toggleClickThrough(true)}
      >
        {/* Local player info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ ...textStyle, fontSize: 16, color: '#ffd700' }}>
            {state.localPlayerName || 'You'}
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span style={{ ...textStyle, fontSize: 15 }}>
              Lv {state.level}
            </span>
            <span style={{ ...textStyle, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {formatTime(state.gameTime)}
            </span>
          </div>
        </div>

        {/* Players alive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ ...textStyle, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Jogadores ({state.playerNames.length})
          </span>
          {state.playerNames.map((name) => (
            <span
              key={name}
              style={{
                ...textStyle,
                fontSize: 12,
                color: name === state.localPlayerName ? '#ffd700' : 'rgba(255,255,255,0.7)',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
