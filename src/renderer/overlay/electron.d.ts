export {};
declare global {
  interface Window {
    overlayApi: {
      onOverlayStateUpdate(callback: (state: unknown) => void): void;
      toggleClickThrough(ignore: boolean): void;
    };
  }
}
