import { Router } from 'express';
import { loginHandler, sessionHandler, logoutHandler } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/auth-rate-limit.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', authRateLimit(), loginHandler);
router.get('/session', authMiddleware, sessionHandler);
router.post('/logout', logoutHandler);

export default router;
