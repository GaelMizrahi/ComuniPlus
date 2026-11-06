import { supabase } from '../config/index.js';
import { positiveId } from '../utils/community.js';

const result = async (query) => { const { data, error } = await query; if (error) throw error; return data; };
const requests = (club) => supabase.from('solicitudViaje').select('*').eq('idComunidad', positiveId(club));
const trips = (club) => supabase.from('Viaje').select('*').eq('idComunidad', positiveId(club));

export const getRequestById = (id, club) => result(requests(club).eq('id', id).maybeSingle());
export async function findPendingRequests(zone, club) {
  const rows = await result(requests(club).order('id', { ascending: false }));
  // Filter text locally, so search cannot inject or remove PostgREST filters.
  const text = String(zone ?? '').toLocaleLowerCase();
  return !text || text === 'todos los viajes' ? rows : rows.filter((row) =>
    [row.lugarDeSalida, row.lugarDeLlegada].some((value) => String(value).toLocaleLowerCase().includes(text)));
}
export async function findAcceptedRequestIds(ids, club) {
  return new Set((ids.length ? await result(trips(club).in('idSolicitudViaje', ids)) : []).map((row) => row.idSolicitudViaje));
}
export const createRequest = ({ seats, departureTime, origin, destination, requesterMemberId, date, communityId }) => result(
  supabase.from('solicitudViaje').insert({ espaciosSolicitados: seats, horarioDeSalida: departureTime,
    lugarDeSalida: String(origin).trim(), lugarDeLlegada: String(destination).trim(),
    idSolicitante: requesterMemberId, diaSalida: date, idComunidad: communityId }).select('*').single());
export const findTripByRequestId = (id, club) => result(trips(club).eq('idSolicitudViaje', id).limit(1).maybeSingle());
export const createTrip = (fields) => result(supabase.from('Viaje').insert(fields).select('*').single());
export const findPassengerRequests = (id, club) => result(requests(club).eq('idSolicitante', id));
export const findTripsByRequestIds = (ids, club) => ids.length ? result(trips(club).in('idSolicitudViaje', ids)) : [];
export const findDriverTrips = (id, club) => result(trips(club).eq('idConductor', id));
export const findRequestsByIds = (ids, club) => ids.length ? result(requests(club).in('id', ids)) : [];
export const findTripById = (id, club) => result(trips(club).eq('id', id).maybeSingle());
export const deleteTrip = (id, club) => result(supabase.from('Viaje').delete().eq('id', id).eq('idComunidad', positiveId(club)));
export const deleteTripsByRequestId = (id, club) => result(supabase.from('Viaje').delete().eq('idSolicitudViaje', id).eq('idComunidad', positiveId(club)));
export const deleteRequest = (id, club, ownerId) => result(supabase.from('solicitudViaje').delete().eq('id', id).eq('idComunidad', positiveId(club)).eq('idSolicitante', ownerId));
