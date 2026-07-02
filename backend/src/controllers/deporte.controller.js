import * as deporteService from '../services/deporte.service.js';

export async function getDeportes(req, res) {
  try {
    const courts = await deporteService.getCourts(req.query.deporte);

    res.json({
      sports: deporteService.getSports(),
      courts
    });
  } catch (error) {
    console.error('===== ERROR GET DEPORTES =====');
    console.error(error);
    console.error(error.message);
    console.error(error.stack);

    res.status(error.statusCode || 500).json({
      message: error.message,
      detail: error
    });
  }
}

export async function getHorarios(req, res) {
  try {
    const slots = await deporteService.getCourtTimeSlots(
      req.params.id,
      req.query.fecha
    );

    res.json(slots);
  } catch (error) {
    console.error('===== ERROR GET HORARIOS =====');
    console.error(error);
    console.error(error.message);
    console.error(error.stack);

    res.status(error.statusCode || 500).json({
      message: error.message,
      detail: error
    });
  }
}