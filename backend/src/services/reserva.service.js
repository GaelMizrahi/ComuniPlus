import { asNumber } from '../utils/helpers.js';
import { getAcceptedMembershipByUserId } from '../repositories/user.repository.js';
import { getCourt, shapeCourt, getCourtTimeSlots } from './deporte.service.js';
import { createReservation, linkReservationToCommunityUser, findReservationForCourtDateTime, findUserReservations, findLinkedReservationById, cancelReservationById } from '../repositories/reserva.repository.js';

function shapeSportReservation(row) {
  const reservation = row.Reserva ?? row;
  const court = reservation.Cancha ?? {};
  return {
    id: reservation.id,
    court: court.nombre,
    courtId: reservation.idCancha,
    date: reservation.fecha,
    time: String(reservation.horario ?? '').slice(0, 5),
    status: reservation.estado ?? 'confirmada',
    pricePerHour: Number(court.precioPorHora ?? 0),
    total: Number(court.precioPorHora ?? 0),
    courtDetail: shapeCourt(court)
  };
}

function reservationDateTime(date, time) {
  return new Date(`${date}T${String(time).slice(0, 5)}:00`);
}

export async function createSportReservation(userId, body) {
  const currentUserId = asNumber(userId);
  const courtId = asNumber(body.courtId ?? body.idCancha);
  const date = String(body.date ?? body.fecha ?? '').trim();
  const time = String(body.time ?? body.horario ?? '').slice(0, 5);

  if (!currentUserId || !courtId || !date || !time) {
    const err = new Error('Faltan campos obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(currentUserId);
  const court = await getCourt(courtId);
  const occupied = await findReservationForCourtDateTime({ courtId, date, time });
  if (occupied) {
    const err = new Error('El horario seleccionado ya está ocupado');
    err.statusCode = 400;
    throw err;
  }

  const reservation = await createReservation({ courtId, date, time });
  await linkReservationToCommunityUser({ communityUserId: membership.id, reservationId: reservation.id });

  return {
    ...shapeSportReservation(reservation),
    courtDetail: shapeCourt(court)
  };
}

export async function getMySportReservations(userId) {
  const membership = await getAcceptedMembershipByUserId(asNumber(userId));
  const rows = await findUserReservations(membership.id);
  return rows.map(shapeSportReservation).filter((reservation) => reservation.id);
}

export async function cancelSportReservation(userId, reservationId) {
  const parsedReservationId = asNumber(reservationId);
  if (!parsedReservationId) {
    const err = new Error('Reserva inválida');
    err.statusCode = 400;
    throw err;
  }

  const membership = await getAcceptedMembershipByUserId(asNumber(userId));
  const linked = await findLinkedReservationById(parsedReservationId, membership.id);
  if (!linked?.Reserva) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const reservation = linked.Reserva;
  const startsAt = reservationDateTime(reservation.fecha, reservation.horario);
  const limit = Date.now() + 36 * 60 * 60 * 1000;
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= limit) {
    const err = new Error('Solo podés cancelar reservas con más de 36 horas de anticipación');
    err.statusCode = 400;
    throw err;
  }

  await cancelReservationById(parsedReservationId);
  return { ok: true };
}

export async function getUpdatedTimeSlots(courtId, date) {
  return getCourtTimeSlots(courtId, date);
}
