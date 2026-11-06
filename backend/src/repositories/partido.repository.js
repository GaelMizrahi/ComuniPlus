import { communityMembers } from './user.repository.js';
import { supabase } from '../config/index.js';

const PARTIDO_COLUMNS =
  'id, idComunidadUsuario, deporte, titulo, descripcion, dia, horario, lugar, jugadoresNecesarios, estado, fechaDeAlta';

export async function createPartido({
  idComunidadUsuario,
  deporte,
  titulo,
  descripcion,
  dia,
  horario,
  lugar,
  jugadoresNecesarios
}) {
  const { data, error } = await supabase
    .from('Partido')
    .insert({
      idComunidadUsuario,
      deporte,
      titulo,
      descripcion,
      dia,
      horario,
      lugar,
      jugadoresNecesarios,
      estado: 1,
      fechaDeAlta: new Date().toISOString()
    })
    .select(PARTIDO_COLUMNS)
    .single();

  if (error) {
    console.error('===== ERROR CREATE PARTIDO =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function findPartidosActivos(communityId) {
  const ids = (await communityMembers(communityId)).map((row) => row.id);
  if (!ids.length) return [];
  const { data = [], error } = await supabase
    .from('Partido')
    .select(PARTIDO_COLUMNS)
    .eq('estado', 1).in('idComunidadUsuario', ids)
    .order('dia', { ascending: true })
    .order('horario', { ascending: true });

  if (error) {
    console.error('===== ERROR FIND PARTIDOS =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function findPartidoById(id, communityId) {
  const ids = (await communityMembers(communityId)).map((row) => row.id);
  if (!ids.length) return null;
  const { data, error } = await supabase
    .from('Partido')
    .select(PARTIDO_COLUMNS)
    .eq('id', id).in('idComunidadUsuario', ids)
    .maybeSingle();

  if (error) {
    console.error('===== ERROR FIND PARTIDO BY ID =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function findJugadoresByPartido(idPartido) {
  const { data = [], error } = await supabase
    .from('PartidoJugador')
    .select('id, idPartido, idComunidadUsuario, fechaDeAlta')
    .eq('idPartido', idPartido);

  if (error) {
    console.error('===== ERROR FIND JUGADORES PARTIDO =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function unirseAPartido({ idPartido, idComunidadUsuario }) {
  const { data, error } = await supabase
    .from('PartidoJugador')
    .insert({
      idPartido,
      idComunidadUsuario,
      fechaDeAlta: new Date().toISOString()
    })
    .select('id, idPartido, idComunidadUsuario, fechaDeAlta')
    .single();

  if (error) {
    console.error('===== ERROR UNIRSE A PARTIDO =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function cancelarPartido(id, ownerId) {
  const { data, error } = await supabase
    .from('Partido')
    .update({ estado: 0 })
    .eq('id', id).eq('idComunidadUsuario', ownerId)
    .select(PARTIDO_COLUMNS)
    .single();

  if (error) {
    console.error('===== ERROR CANCELAR PARTIDO =====');
    console.error(error);
    throw error;
  }

  return data;
}