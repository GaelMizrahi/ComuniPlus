import { asNumber } from '../utils/helpers.js';
import { getAcceptedMembershipByUserId } from '../repositories/user.repository.js';
import {
  createPartido,
  findPartidosActivos,
  cancelarPartido
} from '../repositories/partido.repository.js';

export async function crearPartido(userId, body) {
  const currentUserId = asNumber(userId);

  const deporte = String(body.deporte ?? '').trim();
  const titulo = String(body.titulo ?? '').trim();
  const descripcion = String(body.descripcion ?? '').trim();
  const dia = String(body.dia ?? '').trim();
  const horario = String(body.horario ?? '').slice(0, 5);
  const lugar = String(body.lugar ?? '').trim();
  const jugadoresNecesarios = asNumber(body.jugadoresNecesarios) || 1;

  if (!currentUserId || !deporte || !titulo || !dia || !horario || !lugar) {
    const err = new Error('Faltan campos obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(currentUserId);

  return createPartido({
    idComunidadUsuario: membership.id,
    deporte,
    titulo,
    descripcion,
    dia,
    horario,
    lugar,
    jugadoresNecesarios
  });
}

export async function listarPartidos() {
  return findPartidosActivos();
}

export async function eliminarPartido(id) {
  const partidoId = asNumber(id);

  if (!partidoId) {
    const err = new Error('Partido inválido');
    err.statusCode = 400;
    throw err;
  }

  return cancelarPartido(partidoId);
}