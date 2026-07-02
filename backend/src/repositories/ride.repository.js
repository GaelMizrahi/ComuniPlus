import { supabase } from '../config/index.js';
import { asNumber } from '../utils/helpers.js';

export async function getRequestById(rideId) {
  const { data, error } = await supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, observaciones, restricciones')
    .eq('id', rideId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findPendingRequests(zone) {
  let query = supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, observaciones, restricciones')
    .order('id', { ascending: false });

  if (zone && zone !== 'Todos los viajes') {
    query = query.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);
  }

  const { data = [], error } = await query;
  if (error) throw error;
  return data;
}

export async function findAcceptedRequestIds(requestIds) {
  if (requestIds.length === 0) return new Set();
  const { data: trips = [], error } = await supabase
    .from('Viaje')
    .select('idSolicitudViaje')
    .in('idSolicitudViaje', requestIds);

  if (error) throw error;
  return new Set(trips.map((trip) => trip.idSolicitudViaje));
}

export async function createRequest({
  seats,
  departureTime,
  origin,
  destination,
  requesterUserId,
  date,
  communityId,
  observations,
  restrictions = []
}) {
  console.log("===== CREATE REQUEST =====");
  console.log({
    seats,
    departureTime,
    origin,
    destination,
    requesterUserId,
    date,
    observations,
    restrictions
  });

  const { data, error } = await supabase
    .from('solicitudViaje')
    .insert({
      espaciosSolicitados: seats,
      horarioDeSalida: departureTime,
      lugarDeSalida: String(origin).trim(),
      lugarDeLlegada: String(destination).trim(),
      idSolicitante: requesterUserId,
      idComunidad: communityId,
      diaSalida: date,
      observaciones: observations || null,
      restricciones: restrictions
    })
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, observaciones, restricciones')
    .single();

  if (error) {
    console.error("===== SUPABASE ERROR =====");
    console.error(error);
    console.error(JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("===== INSERT OK =====");
  console.log(data);

  return data;
}

export async function findTripByRequestId(requestId) {
  const { data, error } = await supabase
    .from('Viaje')
    .select('id')
    .eq('idSolicitudViaje', requestId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrip({ horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, conductorId, requestId }) {
  const { data, error } = await supabase
    .from('Viaje')
    .insert({
      lugaresDisponibles: 0,
      horarioDeSalida,
      descripcionAuto: descripcionAuto ?? null,
      patenteAuto: patenteAuto ?? null,
      lugarDeSalida,
      lugarDeLlegada,
      idConductor: conductorId,
      idSolicitudViaje: requestId
    })
    .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
    .single();

  if (error) throw error;
  return data;
}

export async function createCommunityTrip(communityId, tripId) {
  const { error } = await supabase
    .from('ComunidadViaje')
    .insert({ idComunidad: communityId, idViaje: tripId });

  if (error) throw error;
}

export async function findPassengerRequests(userId) {
  const { data = [], error } = await supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, observaciones, restricciones')
    .eq('idSolicitante', userId);

  if (error) throw error;
  return data;
}

export async function findTripsByRequestIds(requestIds) {
  if (requestIds.length === 0) return [];
  const { data = [], error } = await supabase
    .from('Viaje')
    .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
    .in('idSolicitudViaje', requestIds);

  if (error) throw error;
  return data;
}

export async function findDriverTrips(userId) {
  const { data = [], error } = await supabase
    .from('Viaje')
    .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
    .eq('idConductor', userId);

  if (error) throw error;
  return data;
}

export async function findRequestsByIds(requestIds) {
  if (requestIds.length === 0) return [];
  const { data = [], error } = await supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, observaciones, restricciones')
    .in('id', requestIds);

  if (error) throw error;
  return data;
}

export async function findTripById(tripId) {
  const { data, error } = await supabase
    .from('Viaje')
    .select('id, idConductor, idSolicitudViaje')
    .eq('id', tripId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteCommunityTripsByTripId(tripId) {
  await supabase.from('ComunidadViaje').delete().eq('idViaje', tripId);
}

export async function deleteCommunityTripsByTripIds(tripIds) {
  if (tripIds.length > 0) {
    await supabase.from('ComunidadViaje').delete().in('idViaje', tripIds);
  }
}

export async function deleteTrip(tripId) {
  const { error } = await supabase.from('Viaje').delete().eq('id', tripId);
  return error;
}

export async function deleteTripsByRequestId(rideId) {
  await supabase.from('Viaje').delete().eq('idSolicitudViaje', rideId);
}

export async function deleteRequest(rideId) {
  const { error } = await supabase.from('solicitudViaje').delete().eq('id', rideId);
  return error;
}

export async function findTripsByRequestId(rideId) {
  const { data = [], error } = await supabase
    .from('Viaje')
    .select('id')
    .eq('idSolicitudViaje', rideId);

  if (error) throw error;
  return data;
}
