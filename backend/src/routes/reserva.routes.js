import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createReserva, getMisReservas, deleteReserva } from '../controllers/reserva.controller.js';

const router = Router();
router.post('/api/reservas', authMiddleware, createReserva);
router.get('/api/reservas/mias', authMiddleware, getMisReservas);
router.delete('/api/reservas/:id', authMiddleware, deleteReserva);

export default router;
