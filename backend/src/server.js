import express from 'express';
import cors from 'cors';
import { port } from './config/index.js';
import router from './routes/index.js';
import { allowedOrigins } from './config/session.js';
import { browserSecurity } from './middleware/browser-security.js';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const app = express();
app.disable('x-powered-by');
if (process.env.RENDER === 'true') app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});
app.use('/api', browserSecurity);
app.use(cors({ origin: (origin, done) => done(null, Boolean(origin && allowedOrigins.has(origin))), credentials: true }));
app.use('/api/mercado', express.json({ limit: '7mb' }));
app.use(express.json());
app.use(router);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

if (process.env.NODE_ENV === 'production') {
  const dist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  if (!existsSync(`${dist}/index.html`)) throw new Error('Falta compilar frontend: npm run build --prefix frontend');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(`${dist}/index.html`));
}


app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
