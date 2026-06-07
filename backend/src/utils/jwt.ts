import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SessionPayload {
  userId: string;
  spotifyId: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.jwt.secret) as SessionPayload;
}
