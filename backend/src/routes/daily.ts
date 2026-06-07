import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { expensiveLimiter } from '../middleware/rateLimit.js';
import { badRequest } from '../utils/errors.js';
import { getOrCreateDailyChallenge } from '../services/daily.js';
import { sanitizeRounds, type GameRound } from '../services/game.js';
import { gradeGame, type SubmittedAnswer } from '../services/score.js';
import { evaluateAchievements } from '../services/achievements.js';

export const dailyRouter = Router();
dailyRouter.use(requireAuth);

// Today's challenge + whether the user has already played
dailyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const challenge = await getOrCreateDailyChallenge();
    const existing = await prisma.dailyChallengeResult.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: req.user!.userId } },
    });
    const rounds = challenge.payload as unknown as GameRound[];

    res.json({
      challengeId: challenge.id,
      date: challenge.date,
      gameType: challenge.gameType,
      alreadyPlayed: Boolean(existing),
      result: existing
        ? { score: existing.score, correctCount: existing.correctCount }
        : null,
      rounds: existing ? [] : sanitizeRounds(rounds),
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

dailyRouter.post(
  '/submit',
  expensiveLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { answers, durationMs } = submitSchema.parse(req.body);

    const challenge = await getOrCreateDailyChallenge();
    const existing = await prisma.dailyChallengeResult.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId } },
    });
    if (existing) throw badRequest('You already played today’s challenge.');

    const rounds = challenge.payload as unknown as GameRound[];
    const graded = await gradeGame(challenge.gameType, rounds, answers as SubmittedAnswer[]);

    await prisma.$transaction([
      prisma.dailyChallengeResult.create({
        data: {
          challengeId: challenge.id,
          userId,
          score: graded.score,
          correctCount: graded.correctCount,
          durationMs: durationMs ?? null,
        },
      }),
      prisma.gameSession.create({
        data: {
          userId,
          gameType: 'DAILY_CHALLENGE',
          score: graded.score,
          correctCount: graded.correctCount,
          totalRounds: graded.totalRounds,
          durationMs: durationMs ?? null,
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
        icon: a.icon,
      })),
    });
  }),
);
