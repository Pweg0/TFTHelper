import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayApi', {
  onOverlayStateUpdate: (callback: (state: unknown) => void) =>
    ipcRenderer.on('overlay-state-update', (_event, state) => callback(state)),
  toggleClickThrough: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),
});
