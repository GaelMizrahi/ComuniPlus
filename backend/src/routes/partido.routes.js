import { communityMiddleware } from '../middleware/community.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

import {
  crearPartido,
  listarPartidos,
  unirsePartido,
  eliminarPartido
} from '../controllers/partido.controller.js';

const router = Router();

router.get('/partidos', authMiddleware, communityMiddleware, listarPartidos);
router.post('/partidos', authMiddleware, communityMiddleware, crearPartido);
router.post('/partidos/:id/unirse', authMiddleware, communityMiddleware, unirsePartido);
router.delete('/partidos/:id', authMiddleware, communityMiddleware, eliminarPartido);

export default router;