import { supabase } from '../config/index.js';

const MATCH_COLUMNS = 'id, deporte, nivel, fecha, horario, jugadoresFaltantes, estado, idComunidad, idCreador, fechaDeAlta';

export async function findOpenMatches({ deporte, communityId }) {
  let query = supabase
    .from('FaltaJugadorPartido')
    .select(MATCH_COLUMNS)
    .eq('estado', 'abierto')
    .gt('jugadoresFaltantes', 0)
    .order('fecha', { ascending: true })
    .order('horario', { ascending: true });

  if (communityId) query = query.eq('idComunidad', communityId);
  if (deporte) query = query.eq('deporte', deporte);

  const { data = [], error } = await query;
  if (error) throw error;
  return data;
}

export async function findMatchById(matchId) {
  const { data, error } = await supabase
    .from('FaltaJugadorPartido')
    .select(MATCH_COLUMNS)
    .eq('id', matchId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findParticipation({ matchId, communityUserId }) {
  const { data, error } = await supabase
    .from('FaltaJugadorParticipante')
    .select('id, idPartido, idComunidadUsuario, fechaDeAlta')
    .eq('idPartido', matchId)
    .eq('idComunidadUsuario', communityUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createParticipation({ matchId, communityUserId }) {
  const { data, error } = await supabase
    .from('FaltaJugadorParticipante')
    .insert({ idPartido: matchId, idComunidadUsuario: communityUserId })
    .select('id, idPartido, idComunidadUsuario, fechaDeAlta')
    .single();

  if (error) throw error;
  return data;
}

export async function updateMissingPlayers({ matchId, jugadoresFaltantes, estado }) {
  const { data, error } = await supabase
    .from('FaltaJugadorPartido')
    .update({ jugadoresFaltantes, estado })
    .eq('id', matchId)
    .select(MATCH_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
