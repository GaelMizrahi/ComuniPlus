import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDeportes, getHorarios } from '../controllers/deporte.controller.js';

const router = Router();

router.get('/deportes', authMiddleware, getDeportes);
router.get('/deportes/:id/horarios', authMiddleware, getHorarios);

export default router;