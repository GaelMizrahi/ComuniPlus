import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getRides, requestRide, offerRide, cancelRide } from '../controllers/ride.controller.js';

const router = Router();
router.get('/api/rides', authMiddleware, getRides);
router.post('/api/rides/request', authMiddleware, requestRide);
router.post('/api/rides/:rideId/offer', authMiddleware, offerRide);
router.post('/api/rides/:rideId/cancel', authMiddleware, cancelRide);

export default router;
