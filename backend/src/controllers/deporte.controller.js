import * as service from '../services/deporte.service.js';
import { clubHandler } from './club-handler.js';
export const getDeportes = clubHandler(async (r) => ({sports:service.getSports(),courts:await service.getCourts(r.communityMember,r.query.deporte)}));
export const getHorarios = clubHandler((r) => service.getCourtTimeSlots(r.communityMember,r.params.id,r.query.fecha));
