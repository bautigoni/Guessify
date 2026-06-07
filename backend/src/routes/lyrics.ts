import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { expensiveLimiter } from '../middleware/rateLimit.js';
import { notFound } from '../utils/errors.js';
import { getLyricsForTrack } from '../services/lyrics/index.js';

export const lyricsRouter = Router();
lyricsRouter.use(requireAuth);

lyricsRouter.get(
  '/:trackId',
  expensiveLimiter,
  asyncHandler(async (req, res) => {
    const result = await getLyricsForTrack(req.params.trackId);
    if (!result) throw notFound('Lyrics not found for this track');
    res.json(result);
  }),
);
