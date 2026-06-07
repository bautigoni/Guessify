# 🎵 Guessify

**Music trivia powered by your own Spotify library.**

Guessify connects to Spotify, imports your top tracks, artists, playlists and saved
songs, then turns them into 8 addictive trivia game modes — plus a daily challenge,
global leaderboards, achievements and AI-graded lyric writing.

Built with a Spotify-inspired dark UI: black backgrounds, `#1DB954` green accents,
glassmorphism, smooth Framer Motion transitions and responsive mobile-first layouts.

---

## ✨ Features

- **Spotify OAuth 2.0 login** — imports profile, top tracks/artists, playlists, saved
  & recently-played tracks. Tokens refresh automatically.
- **8 game modes**
  1. Guess The Lyrics — snippet → pick the song
  2. Complete The Lyrics — fill in the blanks
  3. Write The Lyrics — type from memory, **graded by AI**
  4. Guess The Song — audio preview → pick the track
  5. Guess The Artist — lyric snippet → pick the artist
  6. Guess The Album — title → pick the album
  7. Guess The Release Year — title → pick the year
  8. Hardcore Mode — your top tracks only, no hints, **2× points**
- **Daily Challenge** — one deterministic challenge per day, shared by everyone.
- **Leaderboards** — global all-time + daily rankings.
- **Achievements** — First Win, 10/100 Correct, Lyrics Master, Spotify Expert… with
  live progress bars.
- **Lyrics service abstraction** — Musixmatch → lyrics.ovh → Genius (priority order),
  cached in PostgreSQL to avoid repeat requests.
- **AI grading** — OpenAI evaluates lyric accuracy, finds missing lines and explains
  the score. Falls back to a deterministic heuristic when no key is set.
- **Security** — JWT sessions (httpOnly cookies), Zod input validation, Helmet, CORS,
  rate limiting, server-side answer keys (answers never sent to the client).

---

## 🧱 Tech Stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React + TypeScript + Vite + TailwindCSS + React Router + TanStack Query + Framer Motion + Recharts |
| Backend   | Node.js + Express + TypeScript |
| Database  | PostgreSQL |
| ORM       | Prisma |
| Auth      | Spotify OAuth 2.0 + JWT |
| AI        | OpenAI API |
| Lyrics    | Musixmatch / lyrics.ovh / Genius |

```
Guessify/
├── backend/          Express API, Prisma schema, services, seed
│   ├── prisma/       schema.prisma, migrations, seed.ts
│   └── src/
│       ├── routes/   auth, user, games, lyrics, daily, leaderboard
│       ├── services/ spotify, import, lyrics/, ai, game, score, achievements, daily
│       └── middleware/ auth, error, rateLimit
├── frontend/         React app (pages, components, api hooks)
├── docker-compose.yml
└── package.json      npm workspaces (root scripts)
```

---

## 🚀 Quick Start (local)

### Prerequisites
- Node.js ≥ 20 and npm ≥ 10
- PostgreSQL (or Docker, see below)

### 1. Install
```bash
git clone <your-fork-url> Guessify
cd Guessify
npm install        # installs both workspaces
```

### 2. Start a database
Use Docker for a one-liner:
```bash
docker run -d --name guessify-db \
  -e POSTGRES_USER=guessify -e POSTGRES_PASSWORD=guessify -e POSTGRES_DB=guessify \
  -p 5432:5432 postgres:16-alpine
```
…or point `DATABASE_URL` at any existing Postgres instance.

### 3. Configure environment
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Edit `backend/.env` and fill in the keys (see **Getting API keys** below). The app
boots even with the lyrics/OpenAI keys blank — those features degrade gracefully.

Generate a strong JWT secret:
```bash
openssl rand -hex 64
```

### 4. Set up the database (generate client, migrate, seed)
```bash
npm run db:setup
```
The seed loads achievements **and** a small demo catalogue with placeholder lyrics so
every game mode is playable immediately — even before connecting Spotify.

### 5. Run
```bash
npm run dev
```
- Frontend → http://localhost:5173
- Backend  → http://localhost:4000 (health check: `/health`)

---

## 🔑 Getting API keys

### Spotify (required for login)
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an app. Copy the **Client ID** and **Client Secret**.
3. Add this Redirect URI **exactly**:
   `http://localhost:4000/api/auth/spotify/callback`
4. Put the values in `backend/.env` (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
   `SPOTIFY_REDIRECT_URI`).

> Spotify apps start in *Development Mode* — add testers' emails under
> **Settings → User Management**, or request a quota extension to go public.

### Lyrics (optional)
- **Musixmatch** — free dev key at <https://developer.musixmatch.com> → `MUSIXMATCH_API_KEY`
- **lyrics.ovh** — no key needed (automatic free fallback)
- **Genius** — token at <https://genius.com/api-clients> → `GENIUS_ACCESS_TOKEN`

Providers are tried in priority order via a swappable abstraction
(`backend/src/services/lyrics/`). Results are cached in the `Lyrics` table.

### OpenAI (optional, for AI lyric grading)
- Key at <https://platform.openai.com/api-keys> → `OPENAI_API_KEY`
- Without a key, "Write The Lyrics" uses a deterministic token-overlap heuristic.

---

## 🐳 Run everything with Docker

```bash
# Optional: export SPOTIFY_CLIENT_ID / SECRET / JWT_SECRET first
docker compose up --build
```
This starts Postgres, runs migrations automatically, and serves:
- Frontend → http://localhost:5173
- Backend  → http://localhost:4000

Then seed the demo data once:
```bash
docker compose exec backend npx prisma db seed
```

---

## 📜 npm scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Run backend + frontend together |
| `npm run build` | Production build of both |
| `npm run db:setup` | Prisma generate → migrate → seed |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:seed` | Seed achievements + demo catalogue |

Backend-only: `npm run prisma:studio`, `npm run typecheck` (inside `backend/`).

---

## ☁️ Production deployment

### Frontend → Vercel
1. Import the repo, set **Root Directory** to `frontend/`.
2. Build command `npm run build`, output `dist` (a `vercel.json` is included with the
   SPA rewrite).
3. Set env var `VITE_API_URL=https://<your-backend-domain>`.

### Backend → Railway / Render
1. Create a PostgreSQL instance; copy its connection string to `DATABASE_URL`.
2. Deploy the `backend/` folder (a `Dockerfile` is provided).
3. Set env vars: `JWT_SECRET`, `CLIENT_URL` (your Vercel URL), `SPOTIFY_CLIENT_ID`,
   `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` (must point at the deployed backend
   callback), and optional `MUSIXMATCH_API_KEY` / `GENIUS_ACCESS_TOKEN` /
   `OPENAI_API_KEY`.
4. Start command: `npx prisma migrate deploy && node dist/index.js` (the Dockerfile
   already does this).
5. Update the Spotify dashboard Redirect URI to the production callback URL.

> Cookies are `SameSite=None; Secure` in production, so the API must be served over
> HTTPS and `CLIENT_URL` must list your exact frontend origin(s).

---

## 🗄️ Data model (Prisma)

`User`, `Track`, `Artist`, `Lyrics`, `Playlist`/`PlaylistTrack`, `UserTopTrack`,
`UserTopArtist`, `SavedTrack`, `GameSession`, `Achievement`/`UserAchievement`,
`DailyChallenge`/`DailyChallengeResult`. See
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

---

## 🔐 Security notes
- Sessions are signed JWTs stored in httpOnly cookies (Bearer header also supported).
- All request bodies are validated with Zod.
- Helmet sets secure headers; CORS is locked to `CLIENT_URL`.
- Rate limiting: global, plus stricter limits on AI/lyrics endpoints.
- Game answer keys live only on the server; clients receive sanitized rounds and are
  graded server-side on submit.
- Secrets are read from environment variables and never shipped to the client.

---

## 📄 License
MIT — built for learning and fun. Lyrics and Spotify content are subject to their
respective providers' terms; use your own API keys.
