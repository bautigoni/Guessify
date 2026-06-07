import { Router } from 'express';
import { z } from 'zod';
import { GameType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { expensiveLimiter } from '../middleware/rateLimit.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { generateGame, sanitizeRounds, type GameRound } from '../services/game.js';
import { gradeGame, type SubmittedAnswer } from '../services/score.js';
import { evaluateAchievements } from '../services/achievements.js';

export const gamesRouter = Router();
gamesRouter.use(requireAuth);

const gameTypes = Object.values(GameType) as [GameType, ...GameType[]];

export const GAME_MODES = [
  { type: 'GUESS_THE_LYRICS', title: 'Guess The Lyrics', description: 'A snippet appears — pick the right song.', icon: '🎤' },
  { type: 'COMPLETE_THE_LYRICS', title: 'Complete The Lyrics', description: 'Fill in the missing words.', icon: '✍️' },
  { type: 'WRITE_THE_LYRICS', title: 'Write The Lyrics', description: 'Type the lyrics from memory, graded by AI.', icon: '🧠' },
  { type: 'GUESS_THE_SONG', title: 'Guess The Song', description: 'Listen to a preview and name the track.', icon: '🔊' },
  { type: 'GUESS_THE_ARTIST', title: 'Guess The Artist', description: 'Read a lyric, name the artist.', icon: '🎸' },
  { type: 'GUESS_THE_ALBUM', title: 'Guess The Album', description: 'Which album is this song from?', icon: '💿' },
  { type: 'GUESS_THE_YEAR', title: 'Guess The Release Year', description: 'When did this track drop?', icon: '📅' },
  { type: 'HARDCORE', title: 'Hardcore Mode', description: 'Top tracks only. No hints. 2× points.', icon: '🔥' },
];

// List available game modes
gamesRouter.get('/modes', (_req, res) => {
  res.json({ modes: GAME_MODES });
});

const startSchema = z.object({
  gameType: z.enum(gameTypes),
  rounds: z.number().int().min(3).max(10).optional(),
});

// Start a game: generate rounds, persist the answer key, return sanitized rounds.
gamesRouter.post(
  '/start',
  expensiveLimiter,
  asyncHandler(async (req, res) => {
    const { gameType, rounds } = startSchema.parse(req.body);
    const userId = req.user!.userId;

    const generated = await generateGame(userId, gameType, rounds);
    if (generated.length === 0) {
      throw badRequest('Could not generate rounds — try importing your library.');
    }

    const session = await prisma.gameSession.create({
      data: {
        userId,
        gameType,
        totalRounds: generated.length,
        details: {
          status: 'in_progress',
          answerKey: generated as unknown as Prisma.JsonArray,
          startedAt: Date.now(),
        } as Prisma.InputJsonValue,
      },
    });

    res.json({
      gameId: session.id,
      gameType,
      rounds: sanitizeRounds(generated),
    });
  }),
);

const submitSchema = z.object({
  durationMs: z.number().int().nonnegative().optional(),
  answers: z
    .array(
      z.object({
        index: z.number().int().nonnegative(),
        choiceId: z.string().optional(),
        text: z.string().max(5000).optional(),
        blanks: z.array(z.string().max(100)).optional(),
      }),
    )
    .max(20),
});

// Submit answers: grade, persist results, update stats, evaluate achievements.
gamesRouter.post(
  '/:id/submit',
  expensiveLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { answers, durationMs } = submitSchema.parse(req.body);

    const session = await prisma.gameSession.findUnique({
      where: { id: req.params.id },
    });
    if (!session) throw notFound('Game session not found');
    if (session.userId !== userId) throw forbidden();

    const details = session.details as { status?: string; answerKey?: unknown } | null;
    if (!details?.answerKey) throw badRequest('Game session has no rounds');
    if (details.status === 'completed') throw badRequest('Game already submitted');

    const answerKey = details.answerKey as unknown as GameRound[];
    const graded = await gradeGame(session.gameType, answerKey, answers as SubmittedAnswer[]);

    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: session.id },
        data: {
          score: graded.score,
          correctCount: graded.correctCount,
          totalRounds: graded.totalRounds,
          durationMs: durationMs ?? null,
          details: {
            status: 'completed',
            results: graded.results as unknown as Prisma.JsonArray,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalScore: { increment: graded.score },
          gamesPlayed: { increment: 1 },
          correctAnswers: { increment: graded.correctCount },
        },
      }),
    ]);

    const newlyUnlocked = await evaluateAchievements(userId);

    res.json({
      score: graded.score,
      correctCount: graded.correctCount,
      totalRounds: graded.totalRounds,
      results: graded.results,
      unlockedAchievements: newlyUnlocked.map((a) => ({
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
      })),
    });
  }),
);
