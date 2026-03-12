import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayApi', {
  onBoardStateUpdate: (callback: (boardState: unknown) => void) =>
    ipcRenderer.on('board-state-update', (_event, boardState) => callback(boardState)),
  toggleClickThrough: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),
});
