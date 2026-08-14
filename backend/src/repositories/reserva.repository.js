import { supabase } from '../config/index.js';

const RESERVATION_COLUMNS =
  'id, horario, dia, deporte, idCancha, cantidadJugadores, estado, fechaDeAlta';

const RESERVATION_WITH_COURT_SELECT = `
  id,
  horario,
  dia,
  deporte,
  idCancha,
  cantidadJugadores,
  estado,
  fechaDeAlta,
  Cancha (
    id,
    numero,
    lugar,
    idComunidad,
    cantidadMax,
    deporte
  )
`;

export async function createReservation({
  courtId,
  date,
  time,
  sport,
  cantidadJugadores
}) {
  const { data, error } = await supabase
    .from('Reserva')
    .insert({
      idCancha: courtId,
      dia: date,
      horario: time,
      deporte: sport,
      cantidadJugadores: cantidadJugadores || 1,
      estado: 1,
      fechaDeAlta: new Date().toISOString()
    })
    .select(RESERVATION_WITH_COURT_SELECT)
    .single();

  if (error) {
    console.error('===== ERROR CREATE RESERVATION =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function linkReservationToCommunityUser({
  communityUserId,
  reservationId
}) {
  const { error } = await supabase
    .from('ComunidadUsuarioReserva')
    .insert({
      idComunidadUsuario: communityUserId,
      idReserva: reservationId
    });

  if (error) {
    console.error('===== ERROR LINK RESERVATION =====');
    console.error(error);
    throw error;
  }
}

export async function findReservationForCourtDateTime({
  courtId,
  date,
  time
}) {
  const { data, error } = await supabase
    .from('Reserva')
    .select(RESERVATION_COLUMNS)
    .eq('idCancha', courtId)
    .eq('dia', date)
    .eq('horario', time)
    .neq('estado', 0)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '===== ERROR FIND RESERVATION FOR COURT DATE TIME ====='
    );
    console.error(error);
    throw error;
  }

  return data;
}

export async function findUserReservations(communityUserId) {
  const { data = [], error } = await supabase
    .from('ComunidadUsuarioReserva')
    .select(`
      id,
      idComunidadUsuario,
      idReserva,
      Reserva (
        ${RESERVATION_WITH_COURT_SELECT}
      )
    `)
    .eq('idComunidadUsuario', communityUserId)
    .order('id', { ascending: false });

  if (error) {
    console.error('===== ERROR FIND USER RESERVATIONS =====');
    console.error(error);
    throw error;
  }

  return data;
}

export async function findLinkedReservationById(
  reservationId,
  communityUserId
) {
  const { data, error } = await supabase
    .from('ComunidadUsuarioReserva')
    .select(`
      id,
      idComunidadUsuario,
      idReserva,
      Reserva (
        ${RESERVATION_WITH_COURT_SELECT}
      )
    `)
    .eq('idReserva', reservationId)
    .eq('idComunidadUsuario', communityUserId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '===== ERROR FIND LINKED RESERVATION BY ID ====='
    );
    console.error(error);
    throw error;
  }

  return data;
}

export async function cancelReservationById(reservationId) {
  const { error } = await supabase
    .from('Reserva')
    .update({ estado: 0 })
    .eq('id', reservationId);

  if (error) {
    console.error('===== ERROR CANCEL RESERVATION =====');
    console.error(error);
    throw error;
  }
}