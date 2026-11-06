import * as service from '../services/partido.service.js';
import { clubHandler } from './club-handler.js';
export const crearPartido = clubHandler((r) => service.crearPartido(r.communityMember,r.body),201);
export const listarPartidos = clubHandler((r) => service.listarPartidos(r.communityMember));
export const unirsePartido = clubHandler((r) => service.unirsePartido(r.communityMember,r.params.id));
export const eliminarPartido = clubHandler(async (r) => { await service.eliminarPartido(r.communityMember,r.params.id); return {ok:true}; });
