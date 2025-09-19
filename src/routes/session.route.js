import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getSessionsHandler,
  deleteSessionHandler,
} from '../controllers/session.controller.js';
import { isLoggedIn } from '../middleware/auth.middleware.js';

const router = Router();

// Rate limiter for general session requests
const sessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    message: 'Too many session requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for session deletion
const deleteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    message: 'Too many delete requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to protect all session routes
router.use(isLoggedIn);

// GET /sessions - Retrieve active user sessions
router.get('/', sessionRateLimiter, getSessionsHandler);

// DELETE /sessions/:id - Remove a specific session
router.delete('/:id', deleteLimiter, deleteSessionHandler);

export default router;