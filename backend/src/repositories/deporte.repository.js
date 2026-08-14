import { supabase } from '../config/index.js';

const COURT_COLUMNS = `
  id,
  numero,
  lugar,
  idComunidad,
  cantidadMax,
  deporte
`;

const RESERVATION_COLUMNS = `
  id,
  horario,
  dia,
  deporte,
  idCancha,
  cantidadJugadores,
  estado,
  fechaDeAlta
`;

export async function findCourts() {
  const { data = [], error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .order('numero', { ascending: true });

  if (error) {
    console.error('===== SUPABASE ERROR findCourts =====');
    console.error(error);
    throw error;
  }

  return data.map((court) => ({
    ...court,

    // Nombres que puede esperar el frontend
    nombre: `Cancha ${court.numero}`,
    ubicacion: court.lugar,

    // Estos campos no existen en Cancha actualmente
    imagen: null,
    precioPorHora: null
  }));
}

export async function findCourtById(courtId) {
  const { data, error } = await supabase
    .from('Cancha')
    .select(COURT_COLUMNS)
    .eq('id', courtId)
    .maybeSingle();

  if (error) {
    console.error('===== SUPABASE ERROR findCourtById =====');
    console.error(error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    nombre: `Cancha ${data.numero}`,
    ubicacion: data.lugar,
    imagen: null,
    precioPorHora: null
  };
}

export async function findReservationsByCourtAndDate(courtId, date) {
  const { data = [], error } = await supabase
    .from('Reserva')
    .select(RESERVATION_COLUMNS)
    .eq('idCancha', courtId)
    .eq('dia', date)
    .neq('estado', 0);

  if (error) {
    console.error(
      '===== SUPABASE ERROR findReservationsByCourtAndDate ====='
    );
    console.error(error);
    throw error;
  }

  return data;
}