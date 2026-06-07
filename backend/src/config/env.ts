import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // In development we warn loudly but don't crash so the app can boot
    // with partial config (e.g. lyrics/OpenAI keys missing).
    console.warn(`[env] Missing required environment variable: ${name}`);
    return '';
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),

  databaseUrl: required('DATABASE_URL'),

  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),

  jwt: {
    secret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  spotify: {
    clientId: required('SPOTIFY_CLIENT_ID'),
    clientSecret: required('SPOTIFY_CLIENT_SECRET'),
    redirectUri:
      process.env.SPOTIFY_REDIRECT_URI ??
      'http://localhost:4000/api/auth/spotify/callback',
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-library-read',
      'user-read-recently-played',
      'playlist-read-private',
      'playlist-read-collaborative',
    ],
  },

  lyrics: {
    musixmatchKey: process.env.MUSIXMATCH_API_KEY ?? '',
    geniusToken: process.env.GENIUS_ACCESS_TOKEN ?? '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
};

export type Env = typeof env;
