import { useEffect } from 'react';

export default function OverlayApp(): JSX.Element {
  useEffect(() => {
    // Re-establish click-through state after any reload (research pitfall 6)
    window.overlayApi.toggleClickThrough(true);
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
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 200,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 8,
          pointerEvents: 'none',
        }}
        onMouseEnter={() => window.overlayApi.toggleClickThrough(false)}
        onMouseLeave={() => window.overlayApi.toggleClickThrough(true)}
      >
        <span
          style={{
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            fontSize: 14,
          }}
        >
          Overlay ready
        </span>
      </div>
    </div>
  );
}
