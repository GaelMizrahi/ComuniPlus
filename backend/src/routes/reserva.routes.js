import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createReserva,
  getMisReservas,
  deleteReserva
} from '../controllers/reserva.controller.js';

const router = Router();

router.post('/reservas', authMiddleware, communityMiddleware, createReserva);
router.get('/reservas/mias', authMiddleware, communityMiddleware, getMisReservas);
router.delete('/reservas/:id', authMiddleware, communityMiddleware, deleteReserva);

export default router;