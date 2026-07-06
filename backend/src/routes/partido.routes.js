import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  crearPartido,
  listarPartidos,
  eliminarPartido
} from '../controllers/partido.controller.js';

const router = Router();

router.get('/api/partidos', authMiddleware, listarPartidos);
router.post('/api/partidos', authMiddleware, crearPartido);
router.delete('/api/partidos/:id', authMiddleware, eliminarPartido);

export default router;