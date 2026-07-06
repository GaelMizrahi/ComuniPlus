import * as partidoService from '../services/partido.service.js';

export async function crearPartido(req, res) {
  try {
    const partido = await partidoService.crearPartido(
      req.user.idUsuario,
      req.body
    );

    res.status(201).json(partido);
  } catch (error) {
    console.error('===== ERROR CREAR PARTIDO =====');
    console.error(error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al crear partido'
    });
  }
}

export async function listarPartidos(req, res) {
  try {
    const partidos = await partidoService.listarPartidos();
    res.json(partidos);
  } catch (error) {
    console.error('===== ERROR LISTAR PARTIDOS =====');
    console.error(error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al listar partidos'
    });
  }
}

export async function eliminarPartido(req, res) {
  try {
    await partidoService.eliminarPartido(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('===== ERROR ELIMINAR PARTIDO =====');
    console.error(error);

    res.status(error.statusCode || 500).json({
      message: error.message || 'Error al eliminar partido'
    });
  }
}