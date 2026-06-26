import { asNumber, shapeReservation } from '../utils/helpers.js';
import { getUsersByIds, getAcceptedMembershipByUserId } from '../repositories/user.repository.js';
import {
  getRequestById,
  findPassengerRequests,
  findTripsByRequestIds,
  findDriverTrips,
  findRequestsByIds,
  findTripById,
  deleteCommunityTripsByTripId,
  deleteTrip,
  deleteRequest
} from '../repositories/ride.repository.js';

export async function getReservations(userId) {
  const currentUserId = asNumber(userId);
  if (!currentUserId) {
    const err = new Error('Falta userId');
    err.statusCode = 400;
    throw err;
  }

  await getAcceptedMembershipByUserId(currentUserId);

  const passengerRequests = await findPassengerRequests(currentUserId);
  const passengerRequestIds = passengerRequests.map((r) => r.id);
  const passengerTrips = await findTripsByRequestIds(passengerRequestIds);
  const driverTrips = await findDriverTrips(currentUserId);

  const driverRequestIds = driverTrips.map((trip) => trip.idSolicitudViaje).filter(Boolean);
  const driverRequests = await findRequestsByIds(driverRequestIds);

  const requestsById = Object.fromEntries(
    [...passengerRequests, ...driverRequests].map((r) => [r.id, r])
  );
  const allTrips = [...passengerTrips, ...driverTrips];
  const usersById = await getUsersByIds([
    currentUserId,
    ...allTrips.map((t) => t.idConductor),
    ...Object.values(requestsById).map((r) => r.idSolicitante)
  ]);

  const seen = new Set();
  return allTrips
    .filter((trip) => {
      if (seen.has(trip.id)) return false;
      seen.add(trip.id);
      return Boolean(requestsById[trip.idSolicitudViaje]);
    })
    .map((trip) => {
      const request = requestsById[trip.idSolicitudViaje];
      return shapeReservation({
        trip,
        request,
        currentUserId,
        requester: usersById[request.idSolicitante],
        conductor: usersById[trip.idConductor]
      });
    });
}

export async function completeReservation(userId, reservationId) {
  const tripId = asNumber(String(reservationId).replace('trip-', '').replace('res-', ''));
  const trip = await findTripById(tripId);
  if (!trip) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const request = await getRequestById(trip.idSolicitudViaje);
  const currentUserId = asNumber(userId);
  if (!request || (Number(request.idSolicitante) !== currentUserId && Number(trip.idConductor) !== currentUserId)) {
    const err = new Error('No tenés permiso para modificar esta reserva');
    err.statusCode = 403;
    throw err;
  }

  await deleteCommunityTripsByTripId(trip.id);
  const deleteTripError = await deleteTrip(trip.id);
  if (deleteTripError) throw deleteTripError;

  const deleteRequestError = await deleteRequest(trip.idSolicitudViaje);
  if (deleteRequestError) throw deleteRequestError;
}

export async function cancelReservation(userId, reservationId) {
  const tripId = asNumber(String(reservationId).replace('trip-', '').replace('res-', ''));
  const currentUserId = asNumber(userId);

  const trip = await findTripById(tripId);
  if (!trip) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const request = await getRequestById(trip.idSolicitudViaje);
  if (!request || (Number(request.idSolicitante) !== currentUserId && Number(trip.idConductor) !== currentUserId)) {
    const err = new Error('No tenés permiso para modificar esta reserva');
    err.statusCode = 403;
    throw err;
  }

  await deleteCommunityTripsByTripId(tripId);
  const error = await deleteTrip(tripId);
  if (error) throw error;
}
