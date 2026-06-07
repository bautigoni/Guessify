import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getOrCreateDailyChallenge } from '../services/daily.js';

export const leaderboardRouter = Router();
leaderboardRouter.use(requireAuth);

// Global all-time leaderboard by total score
leaderboardRouter.get(
  '/global',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { totalScore: 'desc' },
      take: 50,
      select: {
        id: true,
        displayName: true,
        avatar: true,
        totalScore: true,
        gamesPlayed: true,
        correctAnswers: true,
      },
    });
    const ranked = users.map((u, i) => ({
      rank: i + 1,
      ...u,
      isMe: u.id === req.user!.userId,
    }));
    res.json({ leaderboard: ranked });
  }),
);

// Today's daily challenge leaderboard
leaderboardRouter.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const challenge = await getOrCreateDailyChallenge();
    const results = await prisma.dailyChallengeResult.findMany({
      where: { challengeId: challenge.id },
      orderBy: [{ score: 'desc' }, { durationMs: 'asc' }],
      take: 50,
      include: { user: { select: { id: true, displayName: true, avatar: true } } },
    });
    const ranked = results.map((r, i) => ({
      rank: i + 1,
      userId: r.user.id,
      displayName: r.user.displayName,
      avatar: r.user.avatar,
      score: r.score,
      correctCount: r.correctCount,
      isMe: r.user.id === req.user!.userId,
    }));
    res.json({ date: challenge.date, gameType: challenge.gameType, leaderboard: ranked });
  }),
);
