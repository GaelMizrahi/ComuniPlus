import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getRides,
  requestRide,
  offerRide,
  cancelRide
} from '../controllers/ride.controller.js';

const router = Router();

router.get('/rides', authMiddleware, getRides);
router.post('/rides/request', authMiddleware, requestRide);
router.post('/rides/:rideId/offer', authMiddleware, offerRide);
router.post('/rides/:rideId/cancel', authMiddleware, cancelRide);

export default router;