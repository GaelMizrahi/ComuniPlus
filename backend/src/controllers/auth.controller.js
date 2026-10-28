import { login, sessionUser } from '../services/auth.service.js';
import { registrationHandler } from './registration.controller.js';
import { cookieName, cookieOptions, sessionMaxAge, clearSession } from '../config/session.js';

export const loginHandler = async (req, res) => registrationHandler(async () => {
  const { token, ...data } = await login(req.body?.email, req.body?.password);
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionMaxAge });
  return data;
})(req, res);

export const sessionHandler = registrationHandler(async (req) => ({ user: await sessionUser(req.user) }));
export const logoutHandler = (_req, res) => {
  clearSession(res);
  res.set('Cache-Control', 'no-store').json({ ok: true });
};
