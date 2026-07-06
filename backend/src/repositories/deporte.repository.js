import { supabase } from '../config/index.js';

const COURT_COLUMNS = 'id, nombre, ubicacion, imagen, precioPorHora, deporte';
const RESERVATION_COLUMNS = 'id, idCancha, fecha, horario, estado';

export async function findCourts() {
  const { data = [], error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findCourtById(courtId) {
  const { data, error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .eq('id', courtId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findReservationsByCourtAndDate(courtId, date) {
  const { data = [], error } = await supabase
    .from('Reserva')
    .select(RESERVATION_COLUMNS)
    .eq('idCancha', courtId)
    .eq('fecha', date)
    .neq('estado', 'cancelada');

  if (error) throw error;
  return data;
}
