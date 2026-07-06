import * as deporteService from '../services/deporte.service.js';

export async function getDeportes(req, res) {
  try {
    const courts = await deporteService.getCourts(req.query.deporte);
    res.json({ sports: deporteService.getSports(), courts });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al listar deportes' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}

export async function getHorarios(req, res) {
  try {
    const slots = await deporteService.getCourtTimeSlots(req.params.id, req.query.fecha);
    res.json(slots);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'Error al listar horarios' : error.message;
    const body = status === 500 ? { message, detail: error.message } : { message };
    res.status(status).json(body);
  }
}
