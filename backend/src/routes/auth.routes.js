import { Router } from 'express';
import { loginHandler } from '../controllers/auth.controller.js';

const router = Router();
router.post('/api/login', loginHandler);

export default router;
