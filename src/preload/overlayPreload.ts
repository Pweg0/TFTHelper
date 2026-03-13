import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayApi', {
  onOverlayStateUpdate: (callback: (state: unknown) => void) =>
    ipcRenderer.on('overlay-state-update', (_event, state) => callback(state)),
  toggleClickThrough: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),
  /** Returns a map of item apiName -> local file URL for icon display */
  getItemIcons: (): Promise<Record<string, string>> =>
    ipcRenderer.invoke('get-item-icons'),
});
