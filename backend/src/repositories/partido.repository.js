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

export async function findPartidosActivos() {
  const { data = [], error } = await supabase
    .from('Partido')
    .select(PARTIDO_COLUMNS)
    .eq('estado', 1)
    .order('dia', { ascending: true });

  if (error) {
    console.error('===== ERROR FIND PARTIDOS =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function cancelarPartido(id) {
  const { data, error } = await supabase
    .from('Partido')
    .update({ estado: 0 })
    .eq('id', id)
    .select(PARTIDO_COLUMNS)
    .single();

  if (error) {
    console.error('===== ERROR CANCELAR PARTIDO =====');
    console.error(error);
    throw error;
  }

  return data;
}