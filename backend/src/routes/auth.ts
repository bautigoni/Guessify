import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { signSession } from '../utils/jwt.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  getProfile,
} from '../services/spotify.js';
import { importUserLibrary } from '../services/import.js';

export const authRouter = Router();

const STATE_COOKIE = 'guessify_oauth_state';
const TOKEN_COOKIE = 'guessify_token';

function cookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? ('none' as const) : ('lax' as const),
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

// Step 1: redirect the user to Spotify's consent screen
authRouter.get(
  '/spotify/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, cookieOptions(10 * 60 * 1000));
    res.redirect(buildAuthorizeUrl(state));
  }),
);

// Step 2: Spotify redirects back here with a code
authRouter.get(
  '/spotify/callback',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    const clientUrl = env.clientUrls[0];

    if (error) return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(error)}`);

    const storedState = (req.cookies as Record<string, string>)?.[STATE_COOKIE];
    if (!code || !state || state !== storedState) {
      return res.redirect(`${clientUrl}/login?error=state_mismatch`);
    }
    res.clearCookie(STATE_COOKIE, cookieOptions());

    const tokens = await exchangeCodeForTokens(code);
    const profile = await getProfile(tokens.accessToken);

    const user = await prisma.user.upsert({
      where: { spotifyId: profile.id },
      create: {
        spotifyId: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        avatar: profile.images?.[0]?.url ?? null,
        country: profile.country,
        product: profile.product,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
      update: {
        displayName: profile.display_name,
        email: profile.email,
        avatar: profile.images?.[0]?.url ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });

    // Kick off library import in the background (don't block the redirect).
    importUserLibrary(user.id).catch((err) =>
      console.error('[import] failed for', user.id, err?.message),
    );

    const token = signSession({ userId: user.id, spotifyId: user.spotifyId });
    res.cookie(TOKEN_COOKIE, token, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.redirect(`${clientUrl}/dashboard`);
  }),
);

// Return a token in the body too (useful for non-cookie clients / mobile)
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        spotifyId: true,
        displayName: true,
        email: true,
        avatar: true,
        country: true,
        product: true,
        totalScore: true,
        gamesPlayed: true,
        correctAnswers: true,
        createdAt: true,
      },
    });
    res.json({ user });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.clearCookie(TOKEN_COOKIE, cookieOptions());
    res.json({ ok: true });
  }),
);

// Re-import the Spotify library on demand
authRouter.post(
  '/refresh-library',
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await importUserLibrary(req.user!.userId);
    res.json({ ok: true, summary });
  }),
);
