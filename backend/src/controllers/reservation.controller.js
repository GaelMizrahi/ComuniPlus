import * as reservationService from '../services/reservation.service.js';

export async function getReservations(req, res) {
  try {
    const reservations = await reservationService.getReservations(req.user.idUsuario);
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar reservas', detail: error.message });
  }
}

export async function completeReservation(req, res) {
  try {
    await reservationService.completeReservation(req.user.idUsuario, req.params.reservationId);
    res.json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al marcar viaje realizado' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}

export async function cancelReservation(req, res) {
  try {
    await reservationService.cancelReservation(req.user.idUsuario, req.params.reservationId);
    res.json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al cancelar reserva' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}
