import { Router } from 'express';
import authRoutes from './auth.routes.js';
import rideRoutes from './ride.routes.js';
import reservationRoutes from './reservation.routes.js';
import { countRows } from '../repositories/user.repository.js';
import { supabaseUrl, jwtSecret, port } from '../config/index.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'comuniplus-backend', db: Boolean(supabaseUrl), auth: Boolean(jwtSecret), port });
});

router.get('/api/debug/supabase', async (_req, res) => {
  try {
    const tables = await Promise.all(
      ['Usuario', 'Comunidad', 'ComunidadUsuario', 'solicitudViaje', 'Viaje', 'ComunidadViaje'].map(countRows)
    );
    res.json({ ok: true, supabaseUrl, tables });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'No se pudo diagnosticar Supabase', detail: error.message });
  }
});

router.use(authRoutes);
router.use(rideRoutes);
router.use(reservationRoutes);

export default router;
