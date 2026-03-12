import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getStaticData: () => ipcRenderer.invoke('get-static-data'),
  getMetaData: () => ipcRenderer.invoke('get-meta-data'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getIconPath: (set: string, iconUrl: string) => ipcRenderer.invoke('get-icon-path', set, iconUrl),
  onStartupStatus: (callback: (status: { step: string; message: string }) => void) =>
    ipcRenderer.on('startup-status', (_event, status) => callback(status)),
  onGameStarted: (callback: (data: unknown) => void) =>
    ipcRenderer.on('game-started', (_event, data) => callback(data)),
  onGameEnded: (callback: () => void) =>
    ipcRenderer.on('game-ended', () => callback()),
});
