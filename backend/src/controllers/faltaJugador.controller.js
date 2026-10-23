import * as faltaJugadorService from '../services/faltaJugador.service.js';

export async function getPartidos(req, res) {
  try {
    const matches = await faltaJugadorService.getAvailableMatches(
      req.user.idUsuario,
      req.query.deporte
    );

    res.json(matches);
  } catch (error) {
    console.error('===== ERROR GET FALTA JUGADOR PARTIDOS =====');
    console.error(error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al listar partidos'
    });
  }
}

export async function unirseAPartido(req, res) {
  try {
    const match = await faltaJugadorService.joinMatch(req.user.idUsuario, req.params.id);
    res.status(201).json(match);
  } catch (error) {
    console.error('===== ERROR UNIRSE FALTA JUGADOR =====');
    console.error(error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al unirse al partido'
    });
  }
}
