import { asNumber } from '../utils/helpers.js';
import { findCourts, findCourtById, findReservationsByCourtAndDate } from '../repositories/deporte.repository.js';

const SPORTS = ['Fútbol masculino', 'Fútbol femenino', 'Tenis', 'Básquet', 'Patín', 'Pádel', 'Hockey', 'Gimnasia Artística', 'Vóley'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const normalize = (value) => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getSports() {
  return SPORTS;
}

const SPORTS = [
  'Fútbol masculino',
  'Fútbol femenino',
  'Tenis',
  'Básquet',
  'Patín',
  'Pádel',
  'Hockey',
  'Gimnasia Artística',
  'Vóley'
];

export function shapeCourt(court) {
  return {
    id: court.id,
    name: `Cancha ${court.numero}`,
    location: court.lugar,
    image: null,
    pricePerHour: 0,
    sport: SPORTS[(court.numero - 1) % SPORTS.length]
  };
}

export async function getCourts(sport) {
  const courts = await findCourts();
  const normalizedSport = normalize(sport);
  return courts
    .filter((court) => !normalizedSport || normalize(court.deporte) === normalizedSport)
    .map(shapeCourt);
}

export async function getCourt(courtId) {
  const parsedCourtId = asNumber(courtId);
  if (!parsedCourtId) {
    const err = new Error('Cancha inválida');
    err.statusCode = 400;
    throw err;
  }

  const court = await findCourtById(parsedCourtId);
  if (!court) {
    const err = new Error('Cancha no encontrada');
    err.statusCode = 404;
    throw err;
  }
  return court;
}

export async function getCourtTimeSlots(courtId, date) {
  if (!date) {
    const err = new Error('La fecha es obligatoria');
    err.statusCode = 400;
    throw err;
  }

  await getCourt(courtId);
  const reservations = await findReservationsByCourtAndDate(asNumber(courtId), date);
  const occupied = new Set(reservations.map((reservation) => String(reservation.horario).slice(0, 5)));

  return TIME_SLOTS.map((time) => ({ time, available: !occupied.has(time) }));
}
