import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getReservations, completeReservation, cancelReservation } from '../controllers/reservation.controller.js';

const router = Router();
router.get('/reservations', authMiddleware, getReservations);
router.post('/reservations/:reservationId/complete', authMiddleware, completeReservation);
router.post('/reservations/:reservationId/cancel', authMiddleware, cancelReservation);

export default router;
