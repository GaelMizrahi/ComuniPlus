import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDeportes, getHorarios } from '../controllers/deporte.controller.js';

const router = Router();
router.get('/api/deportes', authMiddleware, getDeportes);
router.get('/api/deportes/:id/horarios', authMiddleware, getHorarios);

export default router;
