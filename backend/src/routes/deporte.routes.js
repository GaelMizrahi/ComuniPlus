import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDeportes, getHorarios } from '../controllers/deporte.controller.js';

const router = Router();

router.get('/deportes', authMiddleware, communityMiddleware, getDeportes);
router.get('/deportes/:id/horarios', authMiddleware, communityMiddleware, getHorarios);

export default router;