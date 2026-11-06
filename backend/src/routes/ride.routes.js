import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getRides,
  requestRide,
  offerRide,
  cancelRide
} from '../controllers/ride.controller.js';

const router = Router();

router.get('/rides', authMiddleware, communityMiddleware, getRides);
router.post('/rides/request', authMiddleware, communityMiddleware, requestRide);
router.post('/rides/:rideId/offer', authMiddleware, communityMiddleware, offerRide);
router.post('/rides/:rideId/cancel', authMiddleware, communityMiddleware, cancelRide);

export default router;