import * as service from '../services/ride.service.js';
import { shapeReservation } from '../utils/helpers.js';
import { clubHandler } from './club-handler.js';
export const getRides = clubHandler((r) => service.getRides(r.communityMember, String(r.query.zone ?? '').trim()));
export const requestRide = clubHandler((r) => service.requestRide(r.communityMember, r.body), 201);
export const offerRide = clubHandler(async (r) => shapeReservation(await service.offerRide(r.communityMember, r.params.rideId, r.body)), 201);
export const cancelRide = clubHandler(async (r) => { await service.cancelRide(r.communityMember, r.params.rideId); return { ok:true }; });
