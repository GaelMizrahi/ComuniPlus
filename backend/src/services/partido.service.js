import { asNumber } from '../utils/helpers.js';
import { getAcceptedMembershipByUserId } from '../repositories/user.repository.js';

import {
  createPartido,
  findPartidosActivos,
  findPartidoById,
  findJugadoresByPartido,
  unirseAPartido,
  cancelarPartido
} from '../repositories/partido.repository.js';

function shapePartido(partido, jugadores = [], membershipId = null) {
  const inscritos = jugadores.length;
  const jugadoresNecesarios = Number(partido.jugadoresNecesarios || 1);

  return {
    id: partido.id,
    idComunidadUsuario: partido.idComunidadUsuario,
    deporte: partido.deporte,
    titulo: partido.titulo,
    descripcion: partido.descripcion,
    dia: partido.dia,
    horario: String(partido.horario ?? '').slice(0, 5),
    lugar: partido.lugar,
    jugadoresNecesarios,
    inscritos,
    cuposRestantes: Math.max(jugadoresNecesarios - inscritos, 0),
    lleno: inscritos >= jugadoresNecesarios,
    yaUnido: jugadores.some(
      (jugador) => Number(jugador.idComunidadUsuario) === Number(membershipId)
    ),
    esCreador: Number(partido.idComunidadUsuario) === Number(membershipId),
    estado: partido.estado,
    fechaDeAlta: partido.fechaDeAlta
  };
}

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

export async function listarPartidos(userId) {
  const membership = await getAcceptedMembershipByUserId(asNumber(userId));
  const partidos = await findPartidosActivos();

  const partidosConJugadores = await Promise.all(
    partidos.map(async (partido) => {
      const jugadores = await findJugadoresByPartido(partido.id);
      return shapePartido(partido, jugadores, membership.id);
    })
  );

  return partidosConJugadores;
}

export async function unirsePartido(userId, partidoId) {
  const currentUserId = asNumber(userId);
  const parsedPartidoId = asNumber(partidoId);

  if (!currentUserId || !parsedPartidoId) {
    const err = new Error('Partido inválido');
    err.statusCode = 400;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(currentUserId);
  const partido = await findPartidoById(parsedPartidoId);

  if (!partido || Number(partido.estado) !== 1) {
    const err = new Error('Partido no encontrado');
    err.statusCode = 404;
    throw err;
  }

  if (Number(partido.idComunidadUsuario) === Number(membership.id)) {
    const err = new Error('No podés unirte a tu propio partido');
    err.statusCode = 400;
    throw err;
  }

  const jugadores = await findJugadoresByPartido(parsedPartidoId);

  const yaUnido = jugadores.some(
    (jugador) => Number(jugador.idComunidadUsuario) === Number(membership.id)
  );

  if (yaUnido) {
    const err = new Error('Ya estás unido a este partido');
    err.statusCode = 400;
    throw err;
  }

  if (jugadores.length >= Number(partido.jugadoresNecesarios || 1)) {
    const err = new Error('El partido ya está completo');
    err.statusCode = 400;
    throw err;
  }

  await unirseAPartido({
    idPartido: parsedPartidoId,
    idComunidadUsuario: membership.id
  });

  const jugadoresActualizados = await findJugadoresByPartido(parsedPartidoId);

  return shapePartido(partido, jugadoresActualizados, membership.id);
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