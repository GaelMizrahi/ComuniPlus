import { Router } from 'express';
import { supabase } from '../config/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/auth-rate-limit.js';
import { createRegistrationRepository } from '../repositories/registration.repository.js';
import { createRegistrationService } from '../services/registration.service.js';
import { registrationHandler } from '../controllers/registration.controller.js';

const router = Router();
const service = createRegistrationService(createRegistrationRepository(supabase));
router.get('/registro/comunidades', registrationHandler(() => service.communities()));
router.post('/registro', authRateLimit({ limit:10 }), registrationHandler((r) => service.register(r.body), 201));
router.get('/solicitudes-acceso/permisos', authMiddleware, registrationHandler((r) => service.permissions(r.user)));
router.get('/solicitudes-acceso', authMiddleware, registrationHandler((r) => service.pending(r.user)));
router.patch('/solicitudes-acceso/:id', authMiddleware, registrationHandler((r) => service.decide(r.user, r.params.id, r.body?.action)));
export default router;
