import type { GameType, Track } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getLyricsForTrack, randomSnippet } from './lyrics/index.js';
import { HttpError } from '../utils/errors.js';

export interface GameRound {
  index: number;
  trackId: string;
  prompt: {
    type: 'lyrics' | 'audio' | 'title' | 'cloze';
    lyricsSnippet?: string;
    clozeText?: string; // text with ____ blanks
    blanks?: string[]; // hidden answers (server-side validation only on submit)
    previewUrl?: string | null;
    title?: string;
    artist?: string;
    coverImage?: string | null;
  };
  // For multiple-choice modes
  choices?: { id: string; label: string; sublabel?: string }[];
  correctChoiceId?: string;
}

const ROUNDS_PER_GAME = 7;

// ---------------------------------------------------------------------------
// Track pools
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct<T>(arr: T[], n: number, exclude: (x: T) => boolean): T[] {
  return shuffle(arr.filter((x) => !exclude(x))).slice(0, n);
}

async function getTrackPool(userId: string, hardcoreOnly: boolean): Promise<Track[]> {
  // Hardcore: strictly the user's top tracks
  const topTrackRows = await prisma.userTopTrack.findMany({
    where: { userId },
    include: { track: true },
    orderBy: { rank: 'asc' },
  });
  let pool = topTrackRows.map((r) => r.track);

  if (!hardcoreOnly) {
    const savedRows = await prisma.savedTrack.findMany({
      where: { userId },
      include: { track: true },
    });
    pool = [...pool, ...savedRows.map((r) => r.track)];
  }

  // De-duplicate by id
  const seen = new Set<string>();
  pool = pool.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

  // Fallback: if the user has not imported a library yet, use the global
  // catalogue so the game is still playable (e.g. in demo/seed scenarios).
  if (pool.length < 4) {
    pool = await prisma.track.findMany({ take: 100 });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Lyrics helpers — ensure we have enough lyric-bearing tracks
// ---------------------------------------------------------------------------

async function getTracksWithLyrics(pool: Track[], needed: number): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  // Use already-cached lyrics first
  const cached = await prisma.lyrics.findMany({
    where: { trackId: { in: pool.map((t) => t.id) } },
  });
  for (const c of cached) result.set(c.trackId, c.fullLyrics);

  // Fetch more on demand until we have enough (cap attempts to limit latency)
  let attempts = 0;
  for (const track of shuffle(pool)) {
    if (result.size >= needed) break;
    if (result.has(track.id)) continue;
    if (attempts >= needed * 3) break;
    attempts += 1;
    const lyr = await getLyricsForTrack(track.id);
    if (lyr && lyr.lyrics.length > 20 && !lyr.lyrics.startsWith('Lyrics available')) {
      result.set(track.id, lyr.lyrics);
    }
  }
  return result;
}

function makeCloze(snippet: string): { clozeText: string; blanks: string[] } {
  const words = snippet.split(/(\s+)/);
  const contentIdx = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => /\p{L}{4,}/u.test(w));
  const blanks: string[] = [];
  const toBlank = shuffle(contentIdx).slice(0, Math.max(1, Math.floor(contentIdx.length / 4)));
  const blankSet = new Set(toBlank.map((x) => x.i));
  const clozeText = words
    .map((w, i) => {
      if (blankSet.has(i)) {
        blanks.push(w.replace(/[^\p{L}\p{N}]/gu, ''));
        return '____';
      }
      return w;
    })
    .join('');
  return { clozeText, blanks };
}

// ---------------------------------------------------------------------------
// Round builders
// ---------------------------------------------------------------------------

export async function generateGame(
  userId: string,
  gameType: GameType,
  rounds = ROUNDS_PER_GAME,
): Promise<GameRound[]> {
  const hardcore = gameType === 'HARDCORE';
  const pool = await getTrackPool(userId, hardcore);
  if (pool.length < 4) {
    throw new HttpError(
      422,
      'Not enough music to build a game. Import your Spotify library first.',
      'INSUFFICIENT_DATA',
    );
  }

  switch (gameType) {
    case 'GUESS_THE_SONG':
      return buildGuessSong(pool, rounds);
    case 'GUESS_THE_ALBUM':
      return buildGuessAlbum(pool, rounds);
    case 'GUESS_THE_YEAR':
      return buildGuessYear(pool, rounds);
    case 'GUESS_THE_ARTIST':
      return buildGuessArtist(userId, pool, rounds);
    case 'GUESS_THE_LYRICS':
    case 'HARDCORE':
    case 'DAILY_CHALLENGE':
      return buildGuessLyrics(pool, rounds);
    case 'COMPLETE_THE_LYRICS':
      return buildCompleteLyrics(pool, rounds);
    case 'WRITE_THE_LYRICS':
      return buildWriteLyrics(pool, rounds);
    default:
      return buildGuessLyrics(pool, rounds);
  }
}

function buildGuessSong(pool: Track[], rounds: number): GameRound[] {
  const playable = pool.filter((t) => t.previewUrl);
  const source = playable.length >= 4 ? playable : pool;
  return shuffle(source)
    .slice(0, rounds)
    .map((track, index) => {
      const distractors = pickDistinct(source, 3, (t) => t.id === track.id);
      const choices = shuffle([track, ...distractors]).map((t) => ({
        id: t.id,
        label: t.title,
        sublabel: t.artist,
      }));
      return {
        index,
        trackId: track.id,
        prompt: { type: 'audio', previewUrl: track.previewUrl, coverImage: null },
        choices,
        correctChoiceId: track.id,
      };
    });
}

function buildGuessAlbum(pool: Track[], rounds: number): GameRound[] {
  const withAlbum = pool.filter((t) => t.album);
  const albums = [...new Set(withAlbum.map((t) => t.album as string))];
  return shuffle(withAlbum)
    .slice(0, rounds)
    .map((track, index) => {
      const others = shuffle(albums.filter((a) => a !== track.album)).slice(0, 3);
      const labels = shuffle([track.album as string, ...others]);
      const choices = labels.map((label) => ({ id: label, label }));
      return {
        index,
        trackId: track.id,
        prompt: {
          type: 'title',
          title: track.title,
          artist: track.artist,
          coverImage: track.coverImage,
        },
        choices,
        correctChoiceId: track.album as string,
      };
    });
}

function buildGuessYear(pool: Track[], rounds: number): GameRound[] {
  const withYear = pool.filter((t) => t.releaseYear);
  return shuffle(withYear)
    .slice(0, rounds)
    .map((track, index) => {
      const year = track.releaseYear as number;
      const offsets = shuffle([-5, -3, -2, -1, 1, 2, 3, 5]).slice(0, 3);
      const years = shuffle([year, ...offsets.map((o) => year + o)]).map(String);
      const choices = [...new Set(years)].map((y) => ({ id: y, label: y }));
      return {
        index,
        trackId: track.id,
        prompt: {
          type: 'title',
          title: track.title,
          artist: track.artist,
          coverImage: track.coverImage,
        },
        choices,
        correctChoiceId: String(year),
      };
    });
}

async function buildGuessArtist(
  userId: string,
  pool: Track[],
  rounds: number,
): Promise<GameRound[]> {
  const lyricsMap = await getTracksWithLyrics(pool, rounds);
  const artists = [...new Set(pool.map((t) => t.artist))];
  const out: GameRound[] = [];
  let index = 0;
  for (const [trackId, lyrics] of lyricsMap) {
    if (out.length >= rounds) break;
    const track = pool.find((t) => t.id === trackId)!;
    const others = shuffle(artists.filter((a) => a !== track.artist)).slice(0, 3);
    const choices = shuffle([track.artist, ...others]).map((a) => ({ id: a, label: a }));
    out.push({
      index: index++,
      trackId,
      prompt: { type: 'lyrics', lyricsSnippet: randomSnippet(lyrics, 2) },
      choices,
      correctChoiceId: track.artist,
    });
  }
  return out;
}

async function buildGuessLyrics(pool: Track[], rounds: number): Promise<GameRound[]> {
  const lyricsMap = await getTracksWithLyrics(pool, rounds);
  const out: GameRound[] = [];
  let index = 0;
  for (const [trackId, lyrics] of lyricsMap) {
    if (out.length >= rounds) break;
    const track = pool.find((t) => t.id === trackId)!;
    const distractors = pickDistinct(pool, 3, (t) => t.id === trackId);
    const choices = shuffle([track, ...distractors]).map((t) => ({
      id: t.id,
      label: t.title,
      sublabel: t.artist,
    }));
    out.push({
      index: index++,
      trackId,
      prompt: { type: 'lyrics', lyricsSnippet: randomSnippet(lyrics, 2) },
      choices,
      correctChoiceId: trackId,
    });
  }
  return out;
}

async function buildCompleteLyrics(pool: Track[], rounds: number): Promise<GameRound[]> {
  const lyricsMap = await getTracksWithLyrics(pool, rounds);
  const out: GameRound[] = [];
  let index = 0;
  for (const [trackId, lyrics] of lyricsMap) {
    if (out.length >= rounds) break;
    const track = pool.find((t) => t.id === trackId)!;
    const snippet = randomSnippet(lyrics, 2);
    const { clozeText, blanks } = makeCloze(snippet);
    if (blanks.length === 0) continue;
    out.push({
      index: index++,
      trackId,
      prompt: {
        type: 'cloze',
        clozeText,
        blanks,
        title: track.title,
        artist: track.artist,
      },
    });
  }
  return out;
}

async function buildWriteLyrics(pool: Track[], rounds: number): Promise<GameRound[]> {
  const lyricsMap = await getTracksWithLyrics(pool, Math.max(3, Math.ceil(rounds / 2)));
  const out: GameRound[] = [];
  let index = 0;
  for (const [trackId] of lyricsMap) {
    if (out.length >= 3) break; // writing full lyrics is intensive; fewer rounds
    const track = pool.find((t) => t.id === trackId)!;
    out.push({
      index: index++,
      trackId,
      prompt: {
        type: 'title',
        title: track.title,
        artist: track.artist,
        coverImage: track.coverImage,
      },
    });
  }
  return out;
}

/**
 * Strips answer-revealing fields before sending rounds to the client.
 */
export function sanitizeRounds(rounds: GameRound[]): GameRound[] {
  return rounds.map((r) => ({
    ...r,
    correctChoiceId: undefined,
    prompt: { ...r.prompt, blanks: undefined },
  }));
}
