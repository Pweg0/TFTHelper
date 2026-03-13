import type { OCRChampion } from '../../../main/ocr/types';

const TEXT_SHADOW = '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 6px rgba(0,0,0,0.7)';

/** Positions for up to 3 item icons on a champion square: bottom-left, bottom-center, bottom-right */
const ITEM_POSITIONS: React.CSSProperties[] = [
  { left: 0, bottom: 0 },
  { left: '50%', bottom: 0, transform: 'translateX(-50%)' },
  { right: 0, bottom: 0 },
];

interface ChampionSquareProps {
  champ: OCRChampion;
  itemIconMap: Map<string, string>;
}

function ChampionSquare({ champ, itemIconMap }: ChampionSquareProps): JSX.Element {
  const label = champ.apiName
    ? champ.apiName.replace(/^TFT\d+_/i, '').slice(0, 4)
    : '?';

  return (
    <div
      style={{
        position: 'relative',
        width: 32,
        height: 32,
        background: '#1a1a2e',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      {/* Champion abbreviated name */}
      <span
        style={{
          fontFamily: '"Segoe UI", Arial, sans-serif',
          fontWeight: 700,
          fontSize: 9,
          color: 'white',
          textShadow: TEXT_SHADOW,
          lineHeight: 1,
          textAlign: 'center',
          letterSpacing: '-0.3px',
        }}
      >
        {label}
      </span>

      {/* Star level indicator — gold dots below the name */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginTop: 2,
        }}
      >
        {Array.from({ length: champ.starLevel }, (_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#ffd700',
              boxShadow: '0 0 3px rgba(255,215,0,0.8)',
            }}
          />
        ))}
      </div>

      {/* Item icons overlaid on corners (bottom row) */}
      {champ.itemApiNames.slice(0, 3).map((apiName, idx) => {
        const iconPath = itemIconMap.get(apiName);
        return (
          <div
            key={apiName}
            style={{
              position: 'absolute',
              width: 11,
              height: 11,
              ...(ITEM_POSITIONS[idx] ?? ITEM_POSITIONS[0]),
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.6)',
              zIndex: 1,
            }}
          >
            {iconPath ? (
              <img
                src={iconPath}
                alt={apiName}
                style={{ width: '100%', height: '100%', display: 'block' }}
                draggable={false}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#4a3c1a',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface BoardDisplayProps {
  board: OCRChampion[];
  bench: OCRChampion[];
  /** Map from item apiName to a displayable URL (file:// or data:) */
  itemIconMap: Map<string, string>;
}

/**
 * Renders a horizontal row of small champion squares for the board and bench.
 *
 * Board and bench are separated by a thin vertical divider.
 * Each champion shows: abbreviated name, star level dots, and up to 3 item icons
 * overlaid on the bottom corners of the square.
 *
 * Positioned along the bottom-left of the overlay to avoid overlap with the
 * right-aligned info panel.
 */
export default function BoardDisplay({ board, bench, itemIconMap }: BoardDisplayProps): JSX.Element {
  const hasContent = board.length > 0 || bench.length > 0;
  if (!hasContent) return <></>;

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 120,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        padding: '4px 6px',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }}
    >
      {/* Board champions */}
      {board.map((champ, idx) => (
        <ChampionSquare
          key={`board-${idx}`}
          champ={champ}
          itemIconMap={itemIconMap}
        />
      ))}

      {/* Divider between board and bench */}
      {board.length > 0 && bench.length > 0 && (
        <div
          style={{
            width: 1,
            height: 30,
            background: 'rgba(255,255,255,0.25)',
            marginLeft: 2,
            marginRight: 2,
            flexShrink: 0,
          }}
        />
      )}

      {/* Bench champions */}
      {bench.map((champ, idx) => (
        <ChampionSquare
          key={`bench-${idx}`}
          champ={champ}
          itemIconMap={itemIconMap}
        />
      ))}
    </div>
  );
}
