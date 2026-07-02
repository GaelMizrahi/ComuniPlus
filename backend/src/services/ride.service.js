  import { asNumber, normalizeRestrictions, shapeOpenRide } from '../utils/helpers.js';
  import { getUsersByIds, getAcceptedMembershipByUserId } from '../repositories/user.repository.js';
  import {
    findPendingRequests,
    findAcceptedRequestIds,
    createRequest,
    findTripByRequestId,
    getRequestById,
    createTrip,
    createCommunityTrip,
    findTripsByRequestId,
    deleteCommunityTripsByTripIds,
    deleteTripsByRequestId,
    deleteRequest
  } from '../repositories/ride.repository.js';

  export async function getRides(zone) {
    const requests = await findPendingRequests(zone);
    const requestIds = requests.map((r) => r.id);
    const acceptedRequestIds = await findAcceptedRequestIds(requestIds);
    const usersById = await getUsersByIds(requests.map((r) => r.idSolicitante));

    return requests
      .filter((r) => !acceptedRequestIds.has(r.id))
      .map((r) => shapeOpenRide(r, usersById[r.idSolicitante]));
  }

  export async function requestRide(userId, body) {
    const requesterUserId = asNumber(userId);
    if (!requesterUserId || !body.origin || !body.destination || !body.date || !body.departureTime || !body.seatsNeeded) {
      const err = new Error('Faltan campos obligatorios');
      err.statusCode = 400;
      throw err;
    }

    const seats = asNumber(body.seatsNeeded);
    if (!Number.isFinite(seats) || seats < 1 || seats > 4) {
      const err = new Error('Lugares a buscar debe ser entre 1 y 4');
      err.statusCode = 400;
      throw err;
    }

const membership = await getAcceptedMembershipByUserId(requesterUserId);

const data = await createRequest({
  seats,
  departureTime: body.departureTime,
  origin: body.origin,
  destination: body.destination,
  requesterUserId,
  date: body.date,
  communityId: membership.idComunidad,
  observations: String(body.observations ?? '').trim(),
  restrictions: normalizeRestrictions(body.restrictions)
});
    const usersById = await getUsersByIds([requesterUserId]);
    return shapeOpenRide(data, usersById[requesterUserId]);
  }

  export async function offerRide(userId, rideId, body) {
    const parsedRideId = asNumber(rideId);
    const conductorId = asNumber(userId);
    if (!parsedRideId || !conductorId) {
      const err = new Error('Faltan datos para aceptar el viaje');
      err.statusCode = 400;
      throw err;
    }

    const conductorMembership = await getAcceptedMembershipByUserId(conductorId);
    const request = await getRequestById(parsedRideId);
    if (!request) {
      const err = new Error('Solicitud de viaje no encontrada');
      err.statusCode = 404;
      throw err;
    }

    if (Number(request.idSolicitante) === conductorId) {
      const err = new Error('Esta solicitud es tuya, no puedes aceptarla');
      err.statusCode = 400;
      throw err;
    }

    const existingTrip = await findTripByRequestId(request.id);
    if (existingTrip) {
      const err = new Error('Esta solicitud ya fue tomada');
      err.statusCode = 400;
      throw err;
    }

    const trip = await createTrip({
      horarioDeSalida: request.horarioDeSalida,
      descripcionAuto: body.descripcionAuto ?? null,
      patenteAuto: body.patenteAuto ?? null,
      lugarDeSalida: request.lugarDeSalida,
      lugarDeLlegada: request.lugarDeLlegada,
      conductorId,
      requestId: request.id
    });

    await createCommunityTrip(conductorMembership.idComunidad, trip.id);

    return { trip, request, currentUserId: conductorId, requesterId: request.idSolicitante, conductorId };
  }

  export async function cancelRide(userId, rideId) {
    const parsedRideId = asNumber(rideId);
    const parsedUserId = asNumber(userId);
    if (!parsedRideId || !parsedUserId) {
      const err = new Error('Faltan datos para cancelar');
      err.statusCode = 400;
      throw err;
    }

    await getAcceptedMembershipByUserId(parsedUserId);

    const trips = await findTripsByRequestId(parsedRideId);
    const tripIds = trips.map((trip) => trip.id);
    await deleteCommunityTripsByTripIds(tripIds);
    await deleteTripsByRequestId(parsedRideId);

    const error = await deleteRequest(parsedRideId);
    if (error) throw error;
  }
