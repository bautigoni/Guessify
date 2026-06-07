import axios from 'axios';
import { env } from '../../config/env.js';
import type { LyricsProvider, LyricsResult } from './types.js';

function clean(s: string): string {
  return s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*-\s*.*$/, '').trim();
}

// ---------------------------------------------------------------------------
// 1. Musixmatch (https://developer.musixmatch.com)
// ---------------------------------------------------------------------------
export const musixmatchProvider: LyricsProvider = {
  name: 'musixmatch',
  isAvailable: () => Boolean(env.lyrics.musixmatchKey),
  async fetch(artist, title): Promise<LyricsResult | null> {
    try {
      const { data } = await axios.get(
        'https://api.musixmatch.com/ws/1.1/matcher.lyrics.get',
        {
          params: {
            q_artist: artist,
            q_track: title,
            apikey: env.lyrics.musixmatchKey,
          },
          timeout: 8000,
        },
      );
      const body = data?.message?.body?.lyrics?.lyrics_body as string | undefined;
      if (!body) return null;
      // Musixmatch free tier returns a truncated body with a disclaimer.
      const lyrics = body.split('...')[0].split('******')[0].trim();
      return lyrics ? { lyrics, provider: 'musixmatch' } : null;
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// 2. lyrics.ovh (free, no key)
// ---------------------------------------------------------------------------
export const lyricsOvhProvider: LyricsProvider = {
  name: 'lyrics.ovh',
  isAvailable: () => true,
  async fetch(artist, title): Promise<LyricsResult | null> {
    try {
      const { data } = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(
          clean(artist),
        )}/${encodeURIComponent(clean(title))}`,
        { timeout: 8000 },
      );
      const lyrics = (data?.lyrics as string | undefined)?.trim();
      return lyrics ? { lyrics, provider: 'lyrics.ovh' } : null;
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// 3. Genius (search only; full lyrics require scraping, so we return the
//    description/snippet path. Configured via access token.)
// ---------------------------------------------------------------------------
export const geniusProvider: LyricsProvider = {
  name: 'genius',
  isAvailable: () => Boolean(env.lyrics.geniusToken),
  async fetch(artist, title): Promise<LyricsResult | null> {
    try {
      const { data } = await axios.get('https://api.genius.com/search', {
        params: { q: `${title} ${artist}` },
        headers: { Authorization: `Bearer ${env.lyrics.geniusToken}` },
        timeout: 8000,
      });
      const hit = data?.response?.hits?.[0]?.result;
      if (!hit) return null;
      // The Genius API does not expose full lyrics directly; we surface the
      // matched song URL so the abstraction stays consistent. A scraper could
      // be plugged in here if licensing allows.
      return {
        lyrics: `Lyrics available at: ${hit.url}`,
        provider: 'genius',
      };
    } catch {
      return null;
    }
  },
};

// Priority order as specified in the product brief.
export const lyricsProviders: LyricsProvider[] = [
  musixmatchProvider,
  lyricsOvhProvider,
  geniusProvider,
];
