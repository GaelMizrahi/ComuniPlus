import * as service from '../services/reserva.service.js';
import { clubHandler } from './club-handler.js';
export const createReserva = clubHandler(async (r) => ({reservation:await service.createSportReservation(r.body,r.communityMember)}),201);
export const getMisReservas = clubHandler((r) => service.getMySportReservations(r.communityMember));
export const deleteReserva = clubHandler(async (r) => { await service.cancelSportReservation(r.communityMember,r.params.id); return {ok:true}; });
