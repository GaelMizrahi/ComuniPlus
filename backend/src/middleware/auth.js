import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';
import { readSessionCookie, clearSession } from '../config/session.js';

export function authMiddleware(req, res, next) {
  const token = readSessionCookie(req.headers.cookie);
  if (!token) return res.status(401).json({ ok: false, message: 'Iniciá sesión para continuar' });

  try {
    req.user = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    clearSession(res);
    return res.status(401).json({ ok: false, message: 'Tu sesión venció. Volvé a ingresar.' });
  }
}
