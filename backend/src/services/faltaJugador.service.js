import { asNumber } from '../utils/helpers.js';
import { getAcceptedMembershipByUserId } from '../repositories/user.repository.js';
import {
  createParticipation,
  findMatchById,
  findOpenMatches,
  findParticipation,
  updateMissingPlayers
} from '../repositories/faltaJugador.repository.js';

const normalizeSport = (sport) => String(sport ?? '').trim();

function shapeMatch(match) {
  return {
    id: match.id,
    deporte: match.deporte,
    nivel: match.nivel,
    fecha: match.fecha,
    horario: String(match.horario ?? '').slice(0, 5),
    jugadoresFaltantes: match.jugadoresFaltantes,
    estado: match.estado
  };
}

export async function getAvailableMatches(userId, deporte) {
  const membership = await getAcceptedMembershipByUserId(asNumber(userId));
  const sport = normalizeSport(deporte);
  const matches = await findOpenMatches({
    deporte: sport && sport !== 'Todos' ? sport : '',
    communityId: membership.idComunidad
  });

  return matches.map(shapeMatch);
}

export async function joinMatch(userId, matchId) {
  const parsedMatchId = asNumber(matchId);
  if (!parsedMatchId) {
    const err = new Error('Partido inválido');
    err.statusCode = 400;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(asNumber(userId));
  const match = await findMatchById(parsedMatchId);

  if (!match || Number(match.idComunidad) !== Number(membership.idComunidad)) {
    const err = new Error('Partido no encontrado');
    err.statusCode = 404;
    throw err;
  }

  if (match.estado !== 'abierto' || Number(match.jugadoresFaltantes) <= 0) {
    const err = new Error('El partido ya está completo');
    err.statusCode = 400;
    throw err;
  }

  const existing = await findParticipation({
    matchId: parsedMatchId,
    communityUserId: membership.id
  });

  if (existing) {
    const err = new Error('Ya estás anotado en este partido');
    err.statusCode = 400;
    throw err;
  }

  await createParticipation({
    matchId: parsedMatchId,
    communityUserId: membership.id
  });

  const missing = Math.max(Number(match.jugadoresFaltantes) - 1, 0);
  const updated = await updateMissingPlayers({
    matchId: parsedMatchId,
    jugadoresFaltantes: missing,
    estado: missing === 0 ? 'completo' : 'abierto'
  });

  return shapeMatch(updated);
}
