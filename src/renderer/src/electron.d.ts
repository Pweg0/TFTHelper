export {};

declare global {
  interface Window {
    api: {
      getStaticData(): Promise<object | null>;
      getMetaData(): Promise<{ comps: unknown[]; scrapedAt: number } | null>;
      getConfig(): Promise<{ patchVersion: string; userLocale: string; userRegion: string }>;
      getIconPath(set: string, iconUrl: string): Promise<string>;
      onStartupStatus(callback: (status: { step: string; message: string }) => void): void;
      onGameStarted(callback: (data: unknown) => void): void;
      onGameEnded(callback: () => void): void;
    };
  }
}
