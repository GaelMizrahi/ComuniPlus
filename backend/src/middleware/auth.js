import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ ok: false, message: 'Token no enviado' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'Formato de token inválido' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
  }
}
