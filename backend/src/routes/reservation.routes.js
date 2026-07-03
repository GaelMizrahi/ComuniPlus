import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getReservations, completeReservation, cancelReservation } from '../controllers/reservation.controller.js';

const router = Router();
router.get('/api/reservations', authMiddleware, getReservations);
router.post('/api/reservations/:reservationId/complete', authMiddleware, completeReservation);
router.post('/api/reservations/:reservationId/cancel', authMiddleware, cancelReservation);

export default router;
