import * as rideService from '../services/ride.service.js';
import { shapeReservation } from '../utils/helpers.js';
import { getUsersByIds } from '../repositories/user.repository.js';

export async function getRides(req, res) {
  try {
    const zone = String(req.query.zone ?? '').trim();
    const payload = await rideService.getRides(zone);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar viajes', detail: error.message });
  }
}

export async function requestRide(req, res) {
  try {
    const result = await rideService.requestRide(req.user.idUsuario, req.body);
    res.status(201).json(result);
  } catch (error) {
  console.error("===== ERROR REQUEST RIDE =====");
  console.error(error);
  console.error(error.stack);

  const status = error.statusCode || 500;

  res.status(status).json({
    message: error.message
  });
}
}

export async function offerRide(req, res) {
  try {
    const result = await rideService.offerRide(req.user.idUsuario, req.params.rideId, req.body);
    const usersById = await getUsersByIds([result.requesterId, result.conductorId]);
    const shaped = shapeReservation({
      trip: result.trip,
      request: result.request,
      currentUserId: result.currentUserId,
      requester: usersById[result.requesterId],
      conductor: usersById[result.conductorId]
    });
    res.status(201).json(shaped);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al ofrecer viaje' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}

export async function cancelRide(req, res) {
  try {
    await rideService.cancelRide(req.user.idUsuario, req.params.rideId);
    res.json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al cancelar solicitud' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}
