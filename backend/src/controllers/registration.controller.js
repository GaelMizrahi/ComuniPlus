export const registrationHandler = (operation, successStatus = 200) => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.status(successStatus).json(await operation(req));
  } catch (error) {
    if (['42703','42P01','PGRST200','PGRST202','PGRST204','PGRST205'].includes(error.code)) {
      return res.status(503).json({ code: 'REGISTRATION_SETUP_REQUIRED', message: 'Falta actualizar el registro. Ejecutá database/registro_migration.sql en el SQL Editor de Supabase.' });
    }
    if (error.code === '23505') return res.status(409).json({ message: 'Ya existe una cuenta con ese email. Iniciá sesión.' });
    const status = error.statusCode ?? ({ '42501':403, P0002:404, P0001:409, '22023':400, '23514':400, '23503':400 }[error.code]) ?? 500;
    const message = status >= 500 ? 'No se pudo completar la operación. Intentá nuevamente.'
      : error.code === '23503' ? 'La comunidad elegida no está disponible.'
      : error.code === '23514' ? 'Revisá los datos ingresados.' : error.message;
    if (status >= 500) console.error('[Registro] Error interno sin datos de la solicitud');
    res.status(status).json({ message, ...(error.code?.startsWith('REGISTRATION_') ? { code:error.code } : {}) });
  }
};
