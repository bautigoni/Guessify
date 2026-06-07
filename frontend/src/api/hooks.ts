import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Achievement,
  DashboardData,
  GameMode,
  LeaderboardEntry,
  StartGameResponse,
  SubmitGameResponse,
  User,
} from '../lib/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: User }>('/api/auth/me');
      return data.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboard(timeRange = 'medium_term') {
  return useQuery({
    queryKey: ['dashboard', timeRange],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/api/user/dashboard', {
        params: { timeRange },
      });
      return data;
    },
  });
}

export function useGameModes() {
  return useQuery({
    queryKey: ['game-modes'],
    queryFn: async () => {
      const { data } = await api.get<{ modes: GameMode[] }>('/api/games/modes');
      return data.modes;
    },
    staleTime: Infinity,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await api.get<{ achievements: Achievement[] }>(
        '/api/user/achievements',
      );
      return data.achievements;
    },
  });
}

export function useGlobalLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: async () => {
      const { data } = await api.get<{ leaderboard: LeaderboardEntry[] }>(
        '/api/leaderboard/global',
      );
      return data.leaderboard;
    },
  });
}

export function useDailyLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard', 'daily'],
    queryFn: async () => {
      const { data } = await api.get<{
        date: string;
        gameType: string;
        leaderboard: LeaderboardEntry[];
      }>('/api/leaderboard/daily');
      return data;
    },
  });
}

export function useStartGame() {
  return useMutation({
    mutationFn: async (vars: { gameType: string; rounds?: number }) => {
      const { data } = await api.post<StartGameResponse>('/api/games/start', vars);
      return data;
    },
  });
}

export function useSubmitGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      gameId: string;
      answers: { index: number; choiceId?: string; text?: string; blanks?: string[] }[];
      durationMs?: number;
    }) => {
      const { data } = await api.post<SubmitGameResponse>(
        `/api/games/${vars.gameId}/submit`,
        { answers: vars.answers, durationMs: vars.durationMs },
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['achievements'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

export function useDailyChallenge() {
  return useQuery({
    queryKey: ['daily'],
    queryFn: async () => {
      const { data } = await api.get('/api/daily');
      return data as StartGameResponse & {
        challengeId: string;
        date: string;
        gameType: string;
        alreadyPlayed: boolean;
        result: { score: number; correctCount: number } | null;
      };
    },
  });
}

export function useSubmitDaily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      answers: { index: number; choiceId?: string; text?: string; blanks?: string[] }[];
      durationMs?: number;
    }) => {
      const { data } = await api.post<SubmitGameResponse>('/api/daily/submit', vars);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout');
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useRefreshLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/auth/refresh-library');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
