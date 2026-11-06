import * as service from '../services/reservation.service.js';
import { clubHandler } from './club-handler.js';
export const getReservations = clubHandler((r) => service.getReservations(r.communityMember));
export const completeReservation = clubHandler(async (r) => { await service.completeReservation(r.communityMember,r.params.reservationId); return {ok:true}; });
export const cancelReservation = clubHandler(async (r) => { await service.cancelReservation(r.communityMember,r.params.reservationId); return {ok:true}; });
