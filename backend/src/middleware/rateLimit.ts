import rateLimit from 'express-rate-limit';

/** General API limiter — generous, protects against abuse. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
});

/** Stricter limiter for expensive endpoints (AI grading, lyric fetches). */
export const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
});

/** Auth limiter to prevent brute-force on the callback. */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
