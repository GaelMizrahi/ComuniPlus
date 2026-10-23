export function authRateLimit({ limit = 30, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    const key = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    let bucket = attempts.get(key);
    if (!bucket || bucket.until <= time) {
      for (const [ip, entry] of attempts) if (entry.until <= time) attempts.delete(ip);
      if (attempts.size >= 10000 && !attempts.has(key)) {
        return res.status(429).json({ message: 'Hay demasiados intentos. Probá de nuevo más tarde.' });
      }
      bucket = { count: 0, until: time + windowMs }; attempts.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.until - time) / 1000))));
      return res.status(429).json({ message: 'Demasiados intentos. Esperá unos minutos para volver a intentar.' });
    }
    next();
  };
}
