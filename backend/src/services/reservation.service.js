import { shapeReservation } from '../utils/helpers.js';
import { positiveId, notFound } from '../utils/community.js';
import { memberUsers } from '../repositories/user.repository.js';
import * as repo from '../repositories/ride.repository.js';

export async function getReservations(member) {
  const passengerRequests = await repo.findPassengerRequests(member.id, member.idComunidad);
  const passengerTrips = await repo.findTripsByRequestIds(passengerRequests.map((row) => row.id), member.idComunidad);
  const driverTrips = await repo.findDriverTrips(member.id, member.idComunidad);
  const driverRequests = await repo.findRequestsByIds(driverTrips.map((row) => row.idSolicitudViaje), member.idComunidad);
  const requests = Object.fromEntries([...passengerRequests, ...driverRequests].map((row) => [row.id, row]));
  const trips = [...new Map([...passengerTrips, ...driverTrips].map((row) => [row.id, row])).values()];
  const users = await memberUsers(member.idComunidad, [member.id, ...trips.map((row) => row.idConductor), ...Object.values(requests).map((row) => row.idSolicitante)]);
  return trips.filter((trip) => requests[trip.idSolicitudViaje] && users[trip.idConductor] && users[requests[trip.idSolicitudViaje].idSolicitante])
    .map((trip) => shapeReservation({ trip, request: requests[trip.idSolicitudViaje], currentUserId: member.id,
      requester: users[requests[trip.idSolicitudViaje].idSolicitante], conductor: users[trip.idConductor] }));
}
async function ownedTrip(member, reservationId) {
  const id = positiveId(String(reservationId).replace(/^(trip|res)-/, ''));
  const trip = await repo.findTripById(id, member.idComunidad);
  const request = trip && await repo.getRequestById(trip.idSolicitudViaje, member.idComunidad);
  if (!request || (Number(request.idSolicitante) !== Number(member.id) && Number(trip.idConductor) !== Number(member.id))) notFound('Reserva no encontrada');
  return { trip, request };
}
export async function completeReservation(member, reservationId) {
  const { trip, request } = await ownedTrip(member, reservationId);
  await repo.deleteTrip(trip.id, member.idComunidad);
  await repo.deleteRequest(request.id, member.idComunidad, request.idSolicitante);
}
export async function cancelReservation(member, reservationId) {
  const { trip } = await ownedTrip(member, reservationId);
  await repo.deleteTrip(trip.id, member.idComunidad);
}
