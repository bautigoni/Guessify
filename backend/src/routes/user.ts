import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getAchievementProgress } from '../services/achievements.js';

export const userRouter = Router();

userRouter.use(requireAuth);

/** Dashboard payload: stats, top artists/tracks, playlists. */
userRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || 'medium_term';

    const [user, topArtists, topTracks, playlists, recentSessions] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.userTopArtist.findMany({
          where: { userId, timeRange },
          include: { artist: true },
          orderBy: { rank: 'asc' },
          take: 12,
        }),
        prisma.userTopTrack.findMany({
          where: { userId, timeRange },
          include: { track: true },
          orderBy: { rank: 'asc' },
          take: 12,
        }),
        prisma.playlist.findMany({ where: { userId }, take: 12 }),
        prisma.gameSession.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const savedCount = await prisma.savedTrack.count({ where: { userId } });

    res.json({
      stats: {
        totalScore: user?.totalScore ?? 0,
        gamesPlayed: user?.gamesPlayed ?? 0,
        correctAnswers: user?.correctAnswers ?? 0,
        savedTracks: savedCount,
        topArtists: topArtists.length,
      },
      topArtists: topArtists.map((r) => ({
        rank: r.rank,
        id: r.artist.id,
        name: r.artist.name,
        image: r.artist.image,
        genres: r.artist.genres,
      })),
      topTracks: topTracks.map((r) => ({
        rank: r.rank,
        id: r.track.id,
        title: r.track.title,
        artist: r.track.artist,
        album: r.track.album,
        coverImage: r.track.coverImage,
        previewUrl: r.track.previewUrl,
      })),
      playlists: playlists.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        trackCount: p.trackCount,
      })),
      recentSessions: recentSessions.map((s) => ({
        id: s.id,
        gameType: s.gameType,
        score: s.score,
        correctCount: s.correctCount,
        totalRounds: s.totalRounds,
        createdAt: s.createdAt,
      })),
    });
  }),
);

userRouter.get(
  '/achievements',
  asyncHandler(async (req, res) => {
    const progress = await getAchievementProgress(req.user!.userId);
    res.json({ achievements: progress });
  }),
);

userRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.gameSession.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ sessions });
  }),
);
