import type { NextFunction, Request, Response } from 'express';
import { verifySession, type SessionPayload } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

/**
 * Extracts the JWT from the `guessify_token` cookie or the
 * `Authorization: Bearer <token>` header and attaches the session to req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(unauthorized());

  try {
    req.user = verifySession(token);
    return next();
  } catch {
    return next(unauthorized('Invalid or expired session'));
  }
}

export function extractToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
    'guessify_token'
  ];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}
