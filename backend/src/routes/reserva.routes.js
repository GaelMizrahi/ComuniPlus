import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createReserva,
  getMisReservas,
  deleteReserva
} from '../controllers/reserva.controller.js';

const router = Router();

router.post('/reservas', authMiddleware, createReserva);
router.get('/reservas/mias', authMiddleware, getMisReservas);
router.delete('/reservas/:id', authMiddleware, deleteReserva);

export default router;