import { allowedOrigins } from '../config/session.js';

// Browser requests with credentials must come from an explicitly allowed origin.
// Origin also protects login/logout against CSRF; JSON content alone is insufficient.
export function browserSecurity(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ message: 'Origen no permitido' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigins.has(origin)) {
    return res.status(403).json({ message: 'La operación requiere un origen permitido' });
  }
  if (req.get('Sec-Fetch-Site') === 'cross-site') return res.status(403).json({ message: 'Solicitud entre sitios no permitida' });
  next();
}
