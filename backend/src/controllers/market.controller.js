export function marketErrorResponse(error) {
  if (['42703', '42P01', 'PGRST200', 'PGRST202', 'PGRST204'].includes(error.code)) {
    return { status: 503, code: 'MARKET_SCHEMA_NOT_READY', message: 'La base de Mercado no está actualizada. Ejecutá database/mercado_migration.sql en el SQL Editor de Supabase y recargá la página.' };
  }
  const storageError = error.name === 'StorageApiError';
  if (storageError && /bucket.*not found|bucket.*does not exist/i.test(error.message ?? '')) {
    return { status: 503, code: 'MARKET_STORAGE_NOT_READY', message: 'Falta configurar el bucket mercado para la foto. Ejecutá database/mercado_migration.sql en Supabase.' };
  }
  if (['PGRST301', 'PGRST302'].includes(error.code) || (storageError && [401, 403].includes(Number(error.statusCode)))) {
    return { status: 503, code: 'MARKET_CREDENTIALS_INVALID', message: 'El backend no tiene acceso a Supabase. Revisá SUPABASE_SERVICE_ROLE_KEY y los permisos del proyecto.' };
  }
  const explicit = Number(error.statusCode);
  const status = (Number.isInteger(explicit) && explicit >= 400 && explicit < 500 && !storageError ? explicit : undefined)
    ?? ({ P0002: 404, '42501': 403, '23505': 409, '23514': 400, P0001: 409, '22023': 400 }[error.code]) ?? 500;
  const message = status >= 500 ? 'No se pudo completar la operación de Mercado.'
    : error.code === '23505' ? 'La publicación ya tiene una reserva activa.'
    : error.code === '23514' ? 'La publicación contiene datos inválidos. Revisá los campos ingresados.'
    : error.message;
  return { status, code: status >= 500 ? 'MARKET_UPSTREAM_ERROR' : 'MARKET_REQUEST_REJECTED', message };
}

export const marketHandler = (operation) => async (req, res) => {
  try {
    const result = await operation(req);
    res.json(result);
  } catch (error) {
    const { status, code, message } = marketErrorResponse(error);
    if (status >= 500) {
      // Log only known classifications and the route template; never keys,
      // Supabase diagnostics, uploaded bytes or user-provided request values.
      const source = /^[A-Z0-9_]{2,40}$/.test(error.code ?? '') ? error.code : 'UNKNOWN';
      console.error(`[Mercado] ${code} (${source}) ${req.method} ${req.route?.path ?? ''}`);
    }
    res.status(status).json({ code, message });
  }
};
