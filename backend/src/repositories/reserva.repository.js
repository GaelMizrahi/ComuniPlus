import { supabase } from '../config/index.js';

const RESERVATION_SELECT = 'id, idCancha, fecha, horario, estado, Cancha(id, nombre, ubicacion, imagen, precioPorHora, deporte)';

export async function createReservation({ courtId, date, time, status = 'confirmada' }) {
  const { data, error } = await supabase
    .from('Reserva')
    .insert({ idCancha: courtId, fecha: date, horario: time, estado: status })
    .select(RESERVATION_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function linkReservationToCommunityUser({ communityUserId, reservationId }) {
  const { error } = await supabase
    .from('ComunidadUsuarioReserva')
    .insert({ idComunidadUsuario: communityUserId, idReserva: reservationId });

  if (error) throw error;
}

export async function findReservationForCourtDateTime({ courtId, date, time }) {
  const { data, error } = await supabase
    .from('Reserva')
    .select('id, idCancha, fecha, horario, estado')
    .eq('idCancha', courtId)
    .eq('fecha', date)
    .eq('horario', time)
    .neq('estado', 'cancelada')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findUserReservations(communityUserId) {
  const { data = [], error } = await supabase
    .from('ComunidadUsuarioReserva')
    .select(`id, idComunidadUsuario, idReserva, Reserva(${RESERVATION_SELECT})`)
    .eq('idComunidadUsuario', communityUserId)
    .order('id', { ascending: false });

  if (error) throw error;
  return data;
}

export async function findLinkedReservationById(reservationId, communityUserId) {
  const { data, error } = await supabase
    .from('ComunidadUsuarioReserva')
    .select(`id, idComunidadUsuario, idReserva, Reserva(${RESERVATION_SELECT})`)
    .eq('idReserva', reservationId)
    .eq('idComunidadUsuario', communityUserId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function cancelReservationById(reservationId) {
  const { error } = await supabase
    .from('Reserva')
    .update({ estado: 'cancelada' })
    .eq('id', reservationId);

  if (error) throw error;
}
