import * as reservaService from '../services/reserva.service.js';

export async function createReserva(req, res) {
  try {
    const reservation = await reservaService.createSportReservation(
      req.user.idUsuario,
      req.body
    );

    const horarios = await reservaService.getUpdatedTimeSlots(
      reservation.courtId,
      reservation.date
    );

    res.status(201).json({
      reservation,
      horarios
    });
  } catch (error) {
    console.error('===== ERROR CREATE RESERVA =====');
    console.error(error);

    const status = error.statusCode || 500;

    res.status(status).json({
      message: error.message || 'Error al crear reserva'
    });
  }
}

export async function getMisReservas(req, res) {
  try {
    const reservations = await reservaService.getMySportReservations(
      req.user.idUsuario
    );

    res.json(reservations);
  } catch (error) {
    console.error('===== ERROR GET MIS RESERVAS =====');
    console.error(error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al listar reservas deportivas'
    });
  }
}

export async function deleteReserva(req, res) {
  try {
    await reservaService.cancelSportReservation(
      req.user.idUsuario,
      req.params.id
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('===== ERROR DELETE RESERVA =====');
    console.error(error);

    const status = error.statusCode || 500;

    res.status(status).json({
      message: error.message || 'Error al cancelar reserva deportiva'
    });
  }
}