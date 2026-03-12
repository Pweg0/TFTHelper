import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayApp from './OverlayApp';

const rootElement = document.getElementById('overlay-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <OverlayApp />
    </React.StrictMode>
  );
}
