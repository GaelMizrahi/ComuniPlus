import * as reservaService from '../services/reserva.service.js';

export async function createReserva(req, res) {
  try {
        const reservation = await reservaService.createSportReservation(
        req.body,
        req.user.idUsuario
      );

      res.status(201).json({
        reservation
      });
  } catch (error) {
    const status = error.statusCode || 500;

    const message =
      status === 500
        ? 'Error al crear reserva'
        : error.message;

    const body =
      status === 500
        ? {
            message,
            detail: error.message
          }
        : {
            message
          };

    res.status(status).json(body);
  }
}

export async function getMisReservas(req, res) {
  try {
    const reservations =
      await reservaService.getMySportReservations(
        req.user.idUsuario
      );

    res.json(reservations);
  } catch (error) {
    const status = error.statusCode || 500;

    const message =
      status === 500
        ? 'Error al listar reservas deportivas'
        : error.message;

    const body =
      status === 500
        ? {
            message,
            detail: error.message
          }
        : {
            message
          };

    res.status(status).json(body);
  }
}

export async function deleteReserva(req, res) {
  try {
    await reservaService.cancelSportReservation(
      req.user.idUsuario,
      req.params.id
    );

    res.json({
      ok: true
    });
  } catch (error) {
    const status = error.statusCode || 500;

    const message =
      status === 500
        ? 'Error al cancelar reserva deportiva'
        : error.message;

    const body =
      status === 500
        ? {
            message,
            detail: error.message
          }
        : {
            message
          };

    res.status(status).json(body);
  }
}