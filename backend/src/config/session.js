const production = process.env.NODE_ENV === 'production';
const configured = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
if (production && !configured) throw new Error('Configurar APP_ORIGIN con la URL HTTPS pública');
const origins = configured ? [configured] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
for (const origin of origins) {
  const url = new URL(origin);
  if (url.origin !== origin || (production && url.protocol !== 'https:')) {
    throw new Error('APP_ORIGIN debe ser un origen sin ruta ni barra final; usar HTTPS en producción');
  }
}
export const allowedOrigins = new Set(origins);
export const cookieName = production ? '__Host-comuni_session' : 'comuni_session';
export const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax', path: '/' };
export const sessionMaxAge = 60 * 60 * 1000;

export function readSessionCookie(header = '') {
  const values = header.split(';').map((item) => item.trim()).filter((item) => item.startsWith(`${cookieName}=`));
  if (values.length !== 1) return null;
  try { return decodeURIComponent(values[0].slice(cookieName.length + 1)); } catch { return null; }
}
export function clearSession(res) { res.clearCookie(cookieName, cookieOptions); }
