import { useState, useEffect } from 'react';
import type { OCRChampion, ShopSlot, OCRStatus } from '../../main/ocr/types';
import BoardDisplay from './components/BoardDisplay';
import ShopHighlight from './components/ShopHighlight';
import OCRStatusDot from './components/OCRStatusDot';

/**
 * OverlayState is the full view model pushed from main via IPC.
 * OCR fields were added in Phase 3; they default to safe empty values for backward compat.
 */
interface OverlayState {
  // Live Client API fields
  gold: number;
  level: number;
  gameTime: number;
  playerNames: string[];
  localPlayerName: string;
  // OCR pipeline fields (Phase 3, may be absent during development)
  board?: OCRChampion[];
  bench?: OCRChampion[];
  shop?: ShopSlot[];
  shopVisible?: boolean;
  ocrStatus?: OCRStatus;
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
  const [itemIconMap, setItemIconMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    window.overlayApi.toggleClickThrough(true);
    window.overlayApi.onOverlayStateUpdate((data) => {
      setState(data as OverlayState);
    });

    // Load item icon map once at startup
    window.overlayApi.getItemIcons().then((record) => {
      setItemIconMap(new Map(Object.entries(record)));
    }).catch((err: unknown) => {
      console.warn('[OverlayApp] Failed to load item icons:', err);
    });
  }, []);

  if (!state) {
    return <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} />;
  }

  // Normalize OCR fields with safe defaults for backward compatibility
  const board = state.board ?? [];
  const bench = state.bench ?? [];
  const shop = state.shop ?? [];
  const shopVisible = state.shopVisible ?? false;
  const ocrStatus = state.ocrStatus ?? 'offline';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* Info panel — right-aligned, interactive on hover */}
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
          {/* Player name row with OCR status dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...textStyle, fontSize: 16, color: '#ffd700', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {state.localPlayerName || 'You'}
            </span>
            <OCRStatusDot status={ocrStatus} />
          </div>

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

      {/* Board display — bottom-left, non-interactive */}
      <BoardDisplay board={board} bench={bench} itemIconMap={itemIconMap} />

      {/* Shop highlight — full-screen absolute, non-interactive */}
      <ShopHighlight shop={shop} shopVisible={shopVisible} />
    </div>
  );
}
