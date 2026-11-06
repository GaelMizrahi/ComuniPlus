import { shapeOpenRide } from '../utils/helpers.js';
import { positiveId, notFound } from '../utils/community.js';
import { memberUsers } from '../repositories/user.repository.js';
import * as repo from '../repositories/ride.repository.js';

export async function getRides(member, zone) {
  const requests = await repo.findPendingRequests(zone, member.idComunidad);
  const accepted = await repo.findAcceptedRequestIds(requests.map((row) => row.id), member.idComunidad);
  const users = await memberUsers(member.idComunidad, requests.map((row) => row.idSolicitante));
  return requests.filter((row) => !accepted.has(row.id) && users[row.idSolicitante]).map((row) => shapeOpenRide(row, users[row.idSolicitante]));
}
export async function requestRide(member, body) {
  const seats = Number(body.seatsNeeded);
  if (!body.origin || !body.destination || !body.date || !body.departureTime || !Number.isInteger(seats) || seats < 1 || seats > 4) {
    throw Object.assign(new Error('Completá los datos del viaje y elegí entre 1 y 4 lugares'), { statusCode: 400 });
  }
  const data = await repo.createRequest({ seats, departureTime: body.departureTime, origin: body.origin,
    destination: body.destination, date: body.date, requesterMemberId: member.id, communityId: member.idComunidad });
  const users = await memberUsers(member.idComunidad, [member.id]);
  return shapeOpenRide(data, users[member.id]);
}
export async function offerRide(member, rideId, body) {
  const request = await repo.getRequestById(positiveId(rideId), member.idComunidad);
  if (!request) notFound('Solicitud de viaje no encontrada');
  if (Number(request.idSolicitante) === Number(member.id)) throw Object.assign(new Error('No podés aceptar tu propia solicitud'), { statusCode: 400 });
  const users = await memberUsers(member.idComunidad, [request.idSolicitante, member.id]);
  if (!users[request.idSolicitante]) notFound('Solicitud de viaje no encontrada');
  let trip = await repo.findTripByRequestId(request.id, member.idComunidad);
  if (trip && Number(trip.idConductor) !== Number(member.id)) throw Object.assign(new Error('Esta solicitud ya fue tomada'), { statusCode: 409 });
  trip ??= await repo.createTrip({ espaciosDisponibles: Number(request.espaciosSolicitados) || 1,
    horarioDeSalida: request.horarioDeSalida, diaSalida: request.diaSalida, descripcionAuto: body?.descripcionAuto ?? '',
    lugarDeSalida: request.lugarDeSalida, lugarDeLlegada: request.lugarDeLlegada,
    idConductor: member.id, idSolicitudViaje: request.id, idComunidad: member.idComunidad });
  return { trip, request, currentUserId: member.id, requester: users[request.idSolicitante], conductor: users[member.id] };
}
export async function cancelRide(member, rideId) {
  const id = positiveId(rideId);
  const request = await repo.getRequestById(id, member.idComunidad);
  if (!request || Number(request.idSolicitante) !== Number(member.id)) notFound('Solicitud de viaje no encontrada');
  await repo.deleteTripsByRequestId(id, member.idComunidad);
  await repo.deleteRequest(id, member.idComunidad, member.id);
}
