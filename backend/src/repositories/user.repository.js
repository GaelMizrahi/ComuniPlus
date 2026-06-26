import { supabase } from '../config/index.js';
import { asNumber, mapSupabaseError } from '../utils/helpers.js';

export async function getAcceptedMembershipByUserId(usuarioId) {
  const { data, error } = await supabase
    .from('ComunidadUsuario')
    .select('id, idComunidad, idUsuario, aceptado, nroSocio')
    .eq('idUsuario', asNumber(usuarioId))
    .eq('aceptado', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Usuario sin comunidad aceptada');
  return data;
}

export async function getUsersByIds(userIds) {
  const ids = [...new Set(userIds.map(asNumber).filter(Number.isFinite))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, mail, telefono')
    .in('id', ids);

  if (error) throw error;
  return Object.fromEntries((data ?? []).map((user) => [user.id, user]));
}

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, mail, contraseña, telefono')
    .ilike('mail', email)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function findCommunityById(communityId) {
  const { data, error } = await supabase
    .from('Comunidad')
    .select('id, nombre')
    .eq('id', communityId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function countRows(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return error
    ? { table, ok: false, error: mapSupabaseError(error) }
    : { table, ok: true, count };
}
