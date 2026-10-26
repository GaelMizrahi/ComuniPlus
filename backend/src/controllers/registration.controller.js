export const registrationHandler = (operation, successStatus = 200) => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const unavailable = (error, code, message) => {
    // Only classifications: never log upstream messages, requests or credentials.
    const source = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code ?? '') ? error.code : 'UNKNOWN';
    console.error(`[Registro] ${code} (${source})`);
    return res.status(503).json({ code, message });
  };
  try {
    res.status(successStatus).json(await operation(req));
  } catch (error) {
    if (['42703','42P01','PGRST200','PGRST202','PGRST204','PGRST205'].includes(error.code)) {
      return unavailable(error, 'REGISTRATION_SETUP_REQUIRED', 'Falta actualizar el registro. Ejecutá database/registro_migration.sql en el SQL Editor de Supabase.');
    }
    if (['PGRST301','PGRST302','PGRST303'].includes(error.code) || /^invalid api key$/i.test(error.message ?? '')) {
      return unavailable(error, 'REGISTRATION_CREDENTIALS_INVALID', 'El backend no tiene acceso a Supabase. Revisá la clave del servidor en backend/.env.');
    }
    if (/fetch failed|failed to fetch|networkerror|enotfound|econnrefused|etimedout/i.test(error.message ?? '')) {
      return unavailable(error, 'REGISTRATION_CONNECTION_FAILED', 'El backend no pudo conectarse con Supabase. Revisá la conexión y la URL del proyecto.');
    }
    if (error.code === '23505') return res.status(409).json({ message: 'Ya existe una cuenta con ese email. Iniciá sesión.' });
    const status = error.statusCode ?? ({ '42501':403, P0002:404, P0001:409, '22023':400, '23514':400, '23503':400 }[error.code]) ?? 500;
    const message = status >= 500 ? 'No se pudo completar la operación. Intentá nuevamente.'
      : error.code === '23503' ? 'La comunidad elegida no está disponible.'
      : error.code === '23514' ? 'Revisá los datos ingresados.' : error.message;
    const source = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code ?? '') ? error.code : 'UNKNOWN';
    if (status >= 500) console.error(`[Registro] REGISTRATION_UPSTREAM_ERROR (${source})`);
    res.status(status).json({ message, ...(status >= 500 ? {code:'REGISTRATION_UPSTREAM_ERROR'} : error.code?.startsWith('REGISTRATION_') ? { code:error.code } : {}) });
  }
};
