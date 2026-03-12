import { ChampionIcon } from './ChampionIcon';

interface DisplayPlayer {
  summonerName: string;
  hp: number;
  maxHp: number;
  level: number;
  champions: string[];
  isLocalPlayer: boolean;
  gold?: number;
}

interface PlayerPanelProps {
  player: DisplayPlayer;
}

const TEXT_SHADOW = '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 6px rgba(0,0,0,0.7)';

const baseTextStyle: React.CSSProperties = {
  fontFamily: '"Segoe UI", Arial, sans-serif',
  fontWeight: 600,
  color: 'white',
  textShadow: TEXT_SHADOW,
  lineHeight: 1.2,
};

/**
 * PlayerPanel renders a single player row for the overlay.
 *
 * Layout (compact, ~24px height per row):
 *   [Name]         [HP] [Lv{level}] [{gold}g?]
 *   [ChampionIcon ...champion icons...]
 *
 * All text floats with no background panel — white with dark drop shadow.
 * Local player HP and gold are shown in gold color.
 */
export function PlayerPanel({ player }: PlayerPanelProps): JSX.Element {
  const { summonerName, hp, level, champions, isLocalPlayer, gold } = player;
  const hpColor = isLocalPlayer ? '#ffd700' : 'white';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '1px 2px',
      }}
    >
      {/* Top row: name + stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        {/* Player name */}
        <span
          style={{
            ...baseTextStyle,
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 100,
          }}
        >
          {summonerName}
        </span>

        {/* HP + Level + Gold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span
            style={{
              ...baseTextStyle,
              fontSize: 11,
              color: hpColor,
            }}
          >
            {hp}
          </span>

          <span
            style={{
              ...baseTextStyle,
              fontSize: 10,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Lv{level}
          </span>

          {isLocalPlayer && gold !== undefined && (
            <span
              style={{
                ...baseTextStyle,
                fontSize: 10,
                color: '#ffd700',
              }}
            >
              {gold}g
            </span>
          )}
        </div>
      </div>

      {/* Champion icons row */}
      {champions.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {champions.map((champName, idx) => (
            <ChampionIcon
              key={`${champName}-${idx}`}
              name={champName}
              starLevel={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
