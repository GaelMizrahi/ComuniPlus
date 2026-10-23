import { login } from '../services/auth.service.js';
import { registrationHandler } from './registration.controller.js';

export const loginHandler = registrationHandler((req) => login(req.body?.email, req.body?.password));
