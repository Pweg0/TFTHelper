export {};
declare global {
  interface Window {
    overlayApi: {
      onBoardStateUpdate(callback: (boardState: unknown) => void): void;
      toggleClickThrough(ignore: boolean): void;
    };
  }
}
