export {};
declare global {
  interface Window {
    overlayApi: {
      onOverlayStateUpdate(callback: (state: unknown) => void): void;
      toggleClickThrough(ignore: boolean): void;
      /** Returns a map of item apiName -> local file URL for icon display */
      getItemIcons(): Promise<Record<string, string>>;
    };
  }
}
