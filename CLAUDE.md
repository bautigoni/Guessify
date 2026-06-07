# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Guessify is a music-trivia platform: log in with Spotify, import your library, and play 8 trivia game modes (+ a daily challenge, leaderboards, achievements, AI-graded lyric writing). Spotify-inspired dark UI.

## Monorepo layout

npm **workspaces** with two packages. Root scripts orchestrate both.

- `backend/` — Express + TypeScript + Prisma + PostgreSQL API
- `frontend/` — React + TypeScript + Vite SPA

## Commands

Run from the repo root unless noted.

```bash
npm install            # installs both workspaces
npm run dev            # backend (tsx watch, :4000) + frontend (vite, :5173) concurrently
npm run build          # tsc build of backend, then tsc+vite build of frontend
npm run db:setup       # prisma generate -> migrate dev -> seed  (run once after configuring .env)
npm run prisma:migrate # create/apply a dev migration
npm run prisma:seed    # reseed achievements + demo catalogue
```

Backend-only (run inside `backend/`): `npm run typecheck` (tsc --noEmit), `npm run prisma:studio`, `npm run prisma:deploy` (prod migrations).
Frontend-only (inside `frontend/`): `npm run typecheck`, `npm run build`.

There is **no test suite or linter** configured yet. "Verifying" a change means: `npm run typecheck` in each workspace, `npm run build`, and/or the manual smoke-test flow (start Postgres → migrate → seed → curl the API with a JWT).

### Local database for development
```bash
docker run -d --name guessify-db -e POSTGRES_USER=guessify \
  -e POSTGRES_PASSWORD=guessify -e POSTGRES_DB=guessify -p 5432:5432 postgres:16-alpine
```
Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env` before `npm run db:setup`. The app **boots with blank lyrics/OpenAI keys** — those features degrade gracefully. Only `DATABASE_URL`, `JWT_SECRET`, and the Spotify keys (for real login) matter to start.

## Critical conventions

- **ESM + NodeNext on the backend.** Relative imports MUST include the `.js` extension even though the source is `.ts` (e.g. `import { prisma } from '../lib/prisma.js'`). Omitting it breaks the build/runtime.
- **Secrets** are read in `backend/src/config/env.ts`. Missing vars `warn` instead of crashing so the app boots with partial config. Add new env vars there, and to all three `.env.example` files + `docker-compose.yml`.
- Prisma client is a singleton in `backend/src/lib/prisma.ts` (cached on `globalThis` in dev to survive watch reloads).

## Architecture — the parts that span multiple files

### Game lifecycle (server-authoritative scoring)
The client never receives correct answers. The flow:
1. `POST /api/games/start` → `services/game.ts:generateGame()` builds rounds **with** the answer key, persists the full `GameRound[]` into `GameSession.details` JSON (`status: 'in_progress'`), and returns `sanitizeRounds()` output (answers + cloze blanks stripped).
2. `POST /api/games/:id/submit` → reloads the answer key from `details`, grades via `services/score.ts:gradeGame()`, then in one transaction writes results + increments denormalized `User` aggregates (`totalScore`, `gamesPlayed`, `correctAnswers`), then runs `evaluateAchievements()`.

`GameType` is a Prisma enum; the 8 playable modes live in `GAME_MODES` in `routes/games.ts`. `services/game.ts` has one builder per prompt shape (`lyrics`/`audio`/`title`/`cloze`). To add a mode: add the enum value (schema + migration), a builder, a `switch` case, and a `GAME_MODES` entry; the frontend `GameEngine` renders by `prompt.type` so usually no frontend change is needed.

### Track pools & lyrics-bearing rounds
`getTrackPool()` sources from the user's `UserTopTrack` (+ `SavedTrack` unless Hardcore). If the user has < 4 tracks it falls back to the **global catalogue** so demo/seed users can still play. Lyric-based modes call `getTracksWithLyrics()`, which fetches+caches lyrics on demand (bounded attempts) until enough rounds exist.

### Lyrics provider abstraction
`services/lyrics/` — `providers.ts` defines an ordered list (Musixmatch → lyrics.ovh → Genius), each implementing `LyricsProvider` (`isAvailable()` / `fetch()`). `index.ts:getLyricsForTrack()` checks the `Lyrics` cache table first, then tries available providers in order and caches the result. Swap/add providers by editing the array; nothing else changes.

### AI grading with fallback
`services/ai.ts:gradeLyrics()` uses OpenAI when `OPENAI_API_KEY` is set, otherwise a deterministic token-overlap heuristic (`heuristicGrade`). Both return the same `LyricGrade` shape, so callers (Write-the-Lyrics in `score.ts`) are agnostic.

### Spotify integration
`services/spotify.ts:getUserSpotifyClient(userId)` returns an axios client and **transparently refreshes** the access token (60s safety window) using the stored refresh token, persisting new tokens. Always go through it for per-user Spotify calls. `services/import.ts:importUserLibrary()` is idempotent (upserts) and is fired in the background after OAuth callback and on `POST /api/auth/refresh-library`.

### Daily challenge
`services/daily.ts` generates one challenge per UTC day, **deterministically seeded** from the date (same rounds for everyone), built from the global catalogue, and persisted in `DailyChallenge`. Results go to `DailyChallengeResult` (one per user/day) and also create a `GameSession` of type `DAILY_CHALLENGE`.

### Auth
JWT (`utils/jwt.ts`) in an httpOnly cookie `guessify_token`, **or** an `Authorization: Bearer` header — `middleware/auth.ts:extractToken` accepts both. Cookies are `SameSite=None; Secure` in production, so prod requires HTTPS and exact `CLIENT_URL` origins for CORS.

### Frontend data flow
All server state goes through TanStack Query hooks in `frontend/src/api/hooks.ts` (axios client in `api/client.ts`, `withCredentials: true`). In dev, Vite proxies `/api` → backend; in prod set `VITE_API_URL`. `App.tsx`'s `Protected` wrapper gates routes on `useMe()`. `components/GameEngine.tsx` is the shared play engine reused by both `pages/Play.tsx` and `pages/Daily.tsx`.

## Deployment
Frontend → Vercel (`frontend/vercel.json`, set `VITE_API_URL`). Backend → Railway/Render via `backend/Dockerfile` (runs `prisma migrate deploy` then starts). `docker-compose.yml` runs the whole stack locally; seed once with `docker compose exec backend npx prisma db seed`. Update the Spotify dashboard Redirect URI to the deployed callback.
