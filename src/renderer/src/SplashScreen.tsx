import React from 'react';

interface SplashScreenProps {
  statusMessage: string;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0d1b2a',
    color: '#e0e8f0',
    fontFamily: '"Segoe UI", Arial, sans-serif',
    userSelect: 'none',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: '2rem',
    color: '#c89b3c',
  },
  spinnerWrapper: {
    marginBottom: '1.5rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(200, 155, 60, 0.2)',
    borderTop: '4px solid #c89b3c',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  statusMessage: {
    fontSize: '0.95rem',
    color: '#8fa8c0',
    letterSpacing: '0.03em',
  },
};

export default function SplashScreen({ statusMessage }: SplashScreenProps): JSX.Element {
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h1 style={styles.title}>TFT Helper</h1>

      <div style={styles.spinnerWrapper}>
        <div style={styles.spinner} />
      </div>

      <p style={styles.statusMessage}>{statusMessage}</p>
    </div>
  );
}
