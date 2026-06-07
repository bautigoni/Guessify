export interface LyricsResult {
  lyrics: string;
  provider: string;
}

export interface LyricsProvider {
  name: string;
  /** Returns true if the provider is configured and usable. */
  isAvailable(): boolean;
  /** Fetch lyrics for a track, or null if not found. */
  fetch(artist: string, title: string): Promise<LyricsResult | null>;
}
