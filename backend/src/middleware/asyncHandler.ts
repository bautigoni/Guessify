import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps an async route handler so thrown/rejected errors are forwarded
 * to the Express error middleware instead of crashing the process.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
