interface ChampionIconProps {
  name: string;
  starLevel: number;
}

const STAR_COLORS: Record<number, string> = {
  1: '#c0c0c0',
  2: '#ffd700',
  3: '#ff6b6b',
};

/**
 * ChampionIcon renders a small 22x22px champion icon for the overlay.
 *
 * Phase 3 will load actual images from the icon cache.
 * For now, shows the first 2 characters of the champion name as a text fallback.
 * Star level is indicated by colored dots below the icon square.
 */
export function ChampionIcon({ name, starLevel }: ChampionIconProps): JSX.Element {
  const initials = name.replace(/^TFT\d*_/, '').slice(0, 2).toUpperCase();
  const dotColor = STAR_COLORS[starLevel] ?? STAR_COLORS[1];

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {/* Icon square */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 3,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 8,
            fontWeight: 700,
            fontFamily: '"Segoe UI", Arial, sans-serif',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      </div>

      {/* Star level dots */}
      <div style={{ display: 'flex', gap: 1 }}>
        {Array.from({ length: Math.min(starLevel, 3) }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: dotColor,
              filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.9))',
            }}
          />
        ))}
      </div>
    </div>
  );
}
