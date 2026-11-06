import * as service from '../services/faltaJugador.service.js';
import { clubHandler } from './club-handler.js';
export const getPartidos = clubHandler((r) => service.getAvailableMatches(r.communityMember,r.query.deporte));
export const unirseAPartido = clubHandler((r) => service.joinMatch(r.communityMember,r.params.id),201);
