import { Router } from 'express';
import { loginHandler } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/auth-rate-limit.js';

const router = Router();

router.post('/login', authRateLimit(), loginHandler);

export default router;
