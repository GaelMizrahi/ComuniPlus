import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getPartidos, unirseAPartido } from '../controllers/faltaJugador.controller.js';

const router = Router();
router.get('/falta-jugador/partidos', authMiddleware, communityMiddleware, getPartidos);
router.post('/falta-jugador/partidos/:id/unirse', authMiddleware, communityMiddleware, unirseAPartido);

export default router;
