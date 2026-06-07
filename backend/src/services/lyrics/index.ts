import { prisma } from '../../lib/prisma.js';
import { lyricsProviders } from './providers.js';

/**
 * Returns lyrics for a track, fetching from providers (in priority order) and
 * caching the result in PostgreSQL. Repeated requests hit the cache.
 */
export async function getLyricsForTrack(trackId: string): Promise<{
  lyrics: string;
  provider: string | null;
  cached: boolean;
} | null> {
  const existing = await prisma.lyrics.findUnique({ where: { trackId } });
  if (existing) {
    return { lyrics: existing.fullLyrics, provider: existing.provider, cached: true };
  }

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) return null;

  for (const provider of lyricsProviders) {
    if (!provider.isAvailable()) continue;
    const result = await provider.fetch(track.artist, track.title);
    if (result && result.lyrics.length > 0) {
      await prisma.lyrics.create({
        data: {
          trackId,
          fullLyrics: result.lyrics,
          provider: result.provider,
        },
      });
      return { lyrics: result.lyrics, provider: result.provider, cached: false };
    }
  }

  return null;
}

/** Returns the subset of tracks (from a candidate list) that have lyrics. */
export async function tracksWithLyrics(trackIds: string[]): Promise<Set<string>> {
  const rows = await prisma.lyrics.findMany({
    where: { trackId: { in: trackIds } },
    select: { trackId: true },
  });
  return new Set(rows.map((r) => r.trackId));
}

/** Extracts a random contiguous snippet of N lines from lyrics. */
export function randomSnippet(lyrics: string, lines = 2): string {
  const all = lyrics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('['));
  if (all.length === 0) return lyrics.slice(0, 120);
  if (all.length <= lines) return all.join('\n');
  const start = Math.floor(Math.random() * (all.length - lines));
  return all.slice(start, start + lines).join('\n');
}
