export const newsHandler = (operation, status = 200) => async (req, res) => {
  try { res.status(status).json(await operation(req)); }
  catch (error) {
    if (['42703','42P01','PGRST200','PGRST202','PGRST204','PGRST205'].includes(error.code)) {
      return res.status(503).json({ message: 'Falta actualizar Noticias. Ejecutá database/noticias_migration.sql en Supabase.', code: 'NEWS_SETUP_REQUIRED' });
    }
    if (error.name === 'StorageApiError' && /bucket.*not found|bucket.*does not exist/i.test(error.message ?? '')) {
      return res.status(503).json({ message: 'Falta el bucket de Noticias. Ejecutá database/noticias_migration.sql.', code: 'NEWS_STORAGE_REQUIRED' });
    }
    const code = error.statusCode ?? ({ '42501':403, P0002:404, '23514':400, '22023':400 }[error.code]) ?? 500;
    if (code >= 500) {
      const source = /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(error.code ?? '') ? error.code : 'UNKNOWN';
      console.error(`[Noticias] NEWS_UPSTREAM_ERROR (${source})`);
    }
    res.status(code).json({ message: code >= 500 ? 'No se pudo completar la operación de Noticias. Reintentá.' : error.message });
  }
};
