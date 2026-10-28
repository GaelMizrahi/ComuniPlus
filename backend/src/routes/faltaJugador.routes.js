import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getPartidos, unirseAPartido } from '../controllers/faltaJugador.controller.js';

const router = Router();
router.get('/falta-jugador/partidos', authMiddleware, getPartidos);
router.post('/falta-jugador/partidos/:id/unirse', authMiddleware, unirseAPartido);

export default router;
