import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getReservations, completeReservation, cancelReservation } from '../controllers/reservation.controller.js';

const router = Router();
router.get('/reservations', authMiddleware, communityMiddleware, getReservations);
router.post('/reservations/:reservationId/complete', authMiddleware, communityMiddleware, completeReservation);
router.post('/reservations/:reservationId/cancel', authMiddleware, communityMiddleware, cancelReservation);

export default router;
