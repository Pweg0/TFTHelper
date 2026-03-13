import React, { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';
import './electron.d';

type AppScreen = 'loading' | 'waiting' | 'in-game';

const waitingStyles: Record<string, React.CSSProperties> = {
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
    fontSize: '1.6rem',
    fontWeight: 600,
    color: '#c89b3c',
    marginBottom: '0.5rem',
  },
  message: {
    fontSize: '1.1rem',
    color: '#8fa8c0',
    marginBottom: '1.5rem',
    animation: 'pulse 2s ease-in-out infinite',
  },
  patch: {
    fontSize: '0.8rem',
    color: '#4a6078',
  },
};

const inGameStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0d1b2a',
    color: '#e0e8f0',
    fontFamily: '"Segoe UI", Arial, sans-serif',
  },
  message: {
    fontSize: '1.2rem',
    color: '#c89b3c',
  },
};

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando...');
  const [patchVersion, setPatchVersion] = useState<string>('');

  useEffect(() => {
    // Listen for startup status updates
    window.api.onStartupStatus((status) => {
      setStatusMessage(status.message);

      // Transition to waiting screen when startup signals ready
      if (status.message.toLowerCase().includes('ready') ||
          status.message.toLowerCase().includes('waiting')) {
        setScreen('waiting');

        // Load config to display patch version
        window.api.getConfig().then((config) => {
          if (config?.patchVersion) {
            setPatchVersion(config.patchVersion);
          }
        }).catch(console.warn);
      }
    });

    // Listen for game lifecycle events
    window.api.onGameStarted(() => {
      setScreen('in-game');
    });

    window.api.onGameEnded(() => {
      setScreen('waiting');
    });
  }, []);

  if (screen === 'loading') {
    return <SplashScreen statusMessage={statusMessage} />;
  }

  if (screen === 'waiting') {
    return (
      <div style={waitingStyles.container}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
        `}</style>
        <h1 style={waitingStyles.title}>TFT Helper</h1>
        <p style={waitingStyles.message}>Aguardando partida de TFT...</p>
        {patchVersion && (
          <span style={waitingStyles.patch}>Patch {patchVersion}</span>
        )}
      </div>
    );
  }

  // in-game — overlay is a separate window, main window shows minimal status
  return (
    <div style={inGameStyles.container}>
      <p style={inGameStyles.message}>Partida em andamento</p>
    </div>
  );
}
