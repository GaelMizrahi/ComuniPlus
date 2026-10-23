import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import {
  crearPartido,
  listarPartidos,
  unirsePartido,
  eliminarPartido
} from '../controllers/partido.controller.js';

const router = Router();

router.get('/partidos', authMiddleware, listarPartidos);
router.post('/partidos', authMiddleware, crearPartido);
router.post('/partidos/:id/unirse', authMiddleware, unirsePartido);
router.delete('/partidos/:id', authMiddleware, eliminarPartido);

export default router;