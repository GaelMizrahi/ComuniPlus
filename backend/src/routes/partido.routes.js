import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import {
  crearPartido,
  listarPartidos,
  unirsePartido,
  eliminarPartido
} from '../controllers/partido.controller.js';

const router = Router();

router.get('/api/partidos', authMiddleware, listarPartidos);
router.post('/api/partidos', authMiddleware, crearPartido);
router.post('/api/partidos/:id/unirse', authMiddleware, unirsePartido);
router.delete('/api/partidos/:id', authMiddleware, eliminarPartido);

export default router;