import { prisma } from '../lib/prisma.js';

/**
 * Re-evaluates the user's aggregate stats against all achievement definitions
 * and unlocks any newly-earned achievements. Returns the list of achievements
 * unlocked during this call (for UI toasts).
 */
export async function evaluateAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { achievements: true },
  });
  if (!user) return [];

  const wins = await prisma.gameSession.count({
    where: { userId, correctCount: { gt: 0 } },
  });

  const metrics: Record<string, number> = {
    correctAnswers: user.correctAnswers,
    gamesPlayed: user.gamesPlayed,
    totalScore: user.totalScore,
    wins,
  };

  const definitions = await prisma.achievement.findMany();
  const unlockedIds = new Set(user.achievements.map((a) => a.achievementId));
  const newlyUnlocked: typeof definitions = [];

  for (const def of definitions) {
    if (unlockedIds.has(def.id)) continue;
    const value = metrics[def.metric] ?? 0;
    if (value >= def.threshold) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: def.id },
      });
      newlyUnlocked.push(def);
    }
  }

  return newlyUnlocked;
}

/** Returns all achievements with the user's unlock state and progress. */
export async function getAchievementProgress(userId: string) {
  const [user, definitions, unlocked] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.achievement.findMany({ orderBy: { threshold: 'asc' } }),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);
  if (!user) return [];

  const wins = await prisma.gameSession.count({
    where: { userId, correctCount: { gt: 0 } },
  });
  const metrics: Record<string, number> = {
    correctAnswers: user.correctAnswers,
    gamesPlayed: user.gamesPlayed,
    totalScore: user.totalScore,
    wins,
  };
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return definitions.map((def) => {
    const value = metrics[def.metric] ?? 0;
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      threshold: def.threshold,
      metric: def.metric,
      progress: Math.min(value, def.threshold),
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id) ?? null,
    };
  });
}
