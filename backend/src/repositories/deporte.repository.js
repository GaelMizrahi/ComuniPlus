import { supabase } from '../config/index.js';

const COURT_COLUMNS = 'id, numero, lugar, idComunidad, cantidadMax';
const RESERVATION_COLUMNS = 'id, horario, dia, deporte, idCancha, cantidadJugadores, estado, fechaDeAlta';

export async function findCourts() {
  const { data = [], error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .order('numero');

  if (error) throw error;
  return data;
}

export async function findCourtById(id) {
  const { data, error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findReservationsByCourtAndDate(courtId, date) {
  const { data = [], error } = await supabase
    .from('Reserva')
    .select(RESERVATION_COLUMNS)
    .eq('idCancha', courtId)
    .eq('dia', date);

  if (error) throw error;
  return data;
}