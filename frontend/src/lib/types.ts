export interface User {
  id: string;
  spotifyId: string;
  displayName: string | null;
  email: string | null;
  avatar: string | null;
  country: string | null;
  product: string | null;
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    totalScore: number;
    gamesPlayed: number;
    correctAnswers: number;
    savedTracks: number;
    topArtists: number;
  };
  topArtists: { rank: number; id: string; name: string; image: string | null; genres: string[] }[];
  topTracks: {
    rank: number;
    id: string;
    title: string;
    artist: string;
    album: string | null;
    coverImage: string | null;
    previewUrl: string | null;
  }[];
  playlists: { id: string; name: string; description: string | null; image: string | null; trackCount: number }[];
  recentSessions: {
    id: string;
    gameType: string;
    score: number;
    correctCount: number;
    totalRounds: number;
    createdAt: string;
  }[];
}

export interface GameMode {
  type: string;
  title: string;
  description: string;
  icon: string;
}

export interface RoundChoice {
  id: string;
  label: string;
  sublabel?: string;
}

export interface GameRound {
  index: number;
  trackId: string;
  prompt: {
    type: 'lyrics' | 'audio' | 'title' | 'cloze';
    lyricsSnippet?: string;
    clozeText?: string;
    previewUrl?: string | null;
    title?: string;
    artist?: string;
    coverImage?: string | null;
  };
  choices?: RoundChoice[];
}

export interface StartGameResponse {
  gameId: string;
  gameType: string;
  rounds: GameRound[];
}

export interface RoundResult {
  index: number;
  correct: boolean;
  points: number;
  correctAnswer?: string;
  accuracy?: number;
  grade?: {
    accuracy: number;
    missingLines: string[];
    mistakes: string[];
    explanation: string;
    method: string;
  };
}

export interface SubmitGameResponse {
  score: number;
  correctCount: number;
  totalRounds: number;
  results: RoundResult[];
  unlockedAchievements: { key: string; name: string; description?: string; icon: string | null }[];
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string | null;
  threshold: number;
  metric: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string | null;
  avatar: string | null;
  totalScore?: number;
  score?: number;
  correctCount?: number;
  gamesPlayed?: number;
  isMe: boolean;
}
