
import { Router } from 'express';
import {
  loginHandler,
  registerHandler
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/api/login', loginHandler);
router.post('/api/register', registerHandler);

export default router;
