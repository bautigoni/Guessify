import { GameType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { GameRound } from './game.js';
import { getLyricsForTrack, randomSnippet } from './lyrics/index.js';

const DAILY_TYPES: GameType[] = [
  'GUESS_THE_LYRICS',
  'GUESS_THE_SONG',
  'GUESS_THE_YEAR',
  'GUESS_THE_ARTIST',
];

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dayHash(date: Date): number {
  const s = date.toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns today's daily challenge, generating and persisting it deterministically
 * from the global track catalogue if it doesn't exist yet. The same challenge is
 * served to every player.
 */
export async function getOrCreateDailyChallenge() {
  const date = todayUtc();
  const existing = await prisma.dailyChallenge.findUnique({ where: { date } });
  if (existing) return existing;

  const seed = dayHash(date);
  const gameType = DAILY_TYPES[seed % DAILY_TYPES.length];
  const allTracks = await prisma.track.findMany({ take: 300 });
  const pool = shuffleSeeded(allTracks, seed);

  const rounds: GameRound[] = [];
  let index = 0;

  for (const track of pool) {
    if (rounds.length >= 5) break;

    if (gameType === 'GUESS_THE_SONG') {
      if (!track.previewUrl) continue;
      const distractors = shuffleSeeded(pool.filter((t) => t.id !== track.id), seed + index).slice(0, 3);
      const choices = shuffleSeeded([track, ...distractors], seed + index).map((t) => ({
        id: t.id,
        label: t.title,
        sublabel: t.artist,
      }));
      rounds.push({
        index: index++,
        trackId: track.id,
        prompt: { type: 'audio', previewUrl: track.previewUrl },
        choices,
        correctChoiceId: track.id,
      });
    } else if (gameType === 'GUESS_THE_YEAR') {
      if (!track.releaseYear) continue;
      const year = track.releaseYear;
      const years = shuffleSeeded([year, year - 2, year + 1, year + 3], seed + index).map(String);
      rounds.push({
        index: index++,
        trackId: track.id,
        prompt: { type: 'title', title: track.title, artist: track.artist, coverImage: track.coverImage },
        choices: [...new Set(years)].map((y) => ({ id: y, label: y })),
        correctChoiceId: String(year),
      });
    } else {
      // lyrics-based (GUESS_THE_LYRICS / GUESS_THE_ARTIST)
      const lyr = await getLyricsForTrack(track.id);
      if (!lyr || lyr.lyrics.length < 20 || lyr.lyrics.startsWith('Lyrics available')) continue;
      const snippet = randomSnippet(lyr.lyrics, 2);
      if (gameType === 'GUESS_THE_ARTIST') {
        const artists = [...new Set(pool.map((t) => t.artist))];
        const others = shuffleSeeded(artists.filter((a) => a !== track.artist), seed + index).slice(0, 3);
        rounds.push({
          index: index++,
          trackId: track.id,
          prompt: { type: 'lyrics', lyricsSnippet: snippet },
          choices: shuffleSeeded([track.artist, ...others], seed + index).map((a) => ({ id: a, label: a })),
          correctChoiceId: track.artist,
        });
      } else {
        const distractors = shuffleSeeded(pool.filter((t) => t.id !== track.id), seed + index).slice(0, 3);
        rounds.push({
          index: index++,
          trackId: track.id,
          prompt: { type: 'lyrics', lyricsSnippet: snippet },
          choices: shuffleSeeded([track, ...distractors], seed + index).map((t) => ({
            id: t.id,
            label: t.title,
            sublabel: t.artist,
          })),
          correctChoiceId: track.id,
        });
      }
    }
  }

  return prisma.dailyChallenge.create({
    data: {
      date,
      gameType,
      seed: String(seed),
      payload: rounds as unknown as Prisma.InputJsonValue,
    },
  });
}
