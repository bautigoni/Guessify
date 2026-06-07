import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { gamesRouter } from './routes/games.js';
import { lyricsRouter } from './routes/lyrics.js';
import { dailyRouter } from './routes/daily.js';
import { leaderboardRouter } from './routes/leaderboard.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv, time: new Date().toISOString() });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/games', gamesRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`\n🎵 Guessify API running on http://localhost:${env.port}`);
  console.log(`   Environment: ${env.nodeEnv}`);
  console.log(`   Allowed origins: ${env.clientUrls.join(', ')}\n`);
});
