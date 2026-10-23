import jwt from 'jsonwebtoken';
import { supabase, jwtSecret } from '../config/index.js';
import { createRegistrationRepository } from '../repositories/registration.repository.js';
import { createLoginService } from './registration.service.js';

export const login = createLoginService(createRegistrationRepository(supabase), {
  signToken: (payload) => jwt.sign(payload, jwtSecret, { expiresIn: '1h' })
});
