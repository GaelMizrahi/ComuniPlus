import { supabase } from '../config/index.js';
import { positiveId } from '../utils/community.js';

export async function communityMiddleware(req, res, next) {
  try {
    const { idUsuario, idComunidad, idComunidadUsuario } = req.user;
    for (const value of [idUsuario, idComunidad, idComunidadUsuario]) positiveId(value);
    const { data, error } = await supabase.from('ComunidadUsuario')
      .select('id,idUsuario,idComunidad,aceptado')
      .eq('id', idComunidadUsuario).eq('idUsuario', idUsuario).eq('idComunidad', idComunidad)
      .eq('aceptado', true).maybeSingle();
    if (error) return res.status(503).json({ message: 'No se pudo comprobar la membresía' });
    if (!data) return res.status(403).json({ message: 'Tu membresía en este club no está activa' });
    req.communityMember = data;
    next();
  } catch { return res.status(403).json({ message: 'La sesión no tiene una comunidad válida' }); }
}
