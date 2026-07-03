import { supabase } from '../config/index.js';
import { asNumber } from '../utils/helpers.js';

const REQUEST_COLUMNS = 'id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida, requisitos';
const REQUEST_COLUMNS_FALLBACK = 'id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida';
const TRIP_COLUMNS = 'id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje';
const TRIP_COLUMNS_FALLBACK = 'id, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje';

function isMissingRequirementsColumn(error) {
  return error && (String(error.message ?? '').includes('requisitos') || String(error.details ?? '').includes('requisitos'));
}

function isMissingTripOptionalColumn(error) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`;
  return ['lugaresDisponibles', 'descripcionAuto', 'patenteAuto'].some((column) => text.includes(column));
}

export async function getRequestById(rideId) {
  const { data, error } = await supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .eq('id', rideId)
    .maybeSingle();

  if (error && isMissingRequirementsColumn(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .eq('id', rideId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData;
  }

  if (error) throw error;
  return data;
}

export async function findPendingRequests(zone) {
  let query = supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .order('id', { ascending: false });

  if (zone && zone !== 'Todos los viajes') {
    query = query.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);
  }

  const { data = [], error } = await query;
  if (error && isMissingRequirementsColumn(error)) {
    let fallbackQuery = supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .order('id', { ascending: false });

    if (zone && zone !== 'Todos los viajes') {
      fallbackQuery = fallbackQuery.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);
    }

    const { data: fallbackData = [], error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return fallbackData;
  }
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
  requirements = []
}) {
  console.log("===== CREATE REQUEST =====");
  console.log({
    seats,
    departureTime,
    origin,
    destination,
    requesterUserId,
    date
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
      requisitos: requirements
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (error && isMissingRequirementsColumn(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('solicitudViaje')
      .insert({
        espaciosSolicitados: seats,
        horarioDeSalida: departureTime,
        lugarDeSalida: String(origin).trim(),
        lugarDeLlegada: String(destination).trim(),
        idSolicitante: requesterUserId,
        idComunidad: communityId,
        diaSalida: date
      })
      .select(REQUEST_COLUMNS_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return fallbackData;
  }

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
    .select(TRIP_COLUMNS)
    .single();

  if (error && isMissingTripOptionalColumn(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('Viaje')
      .insert({
        horarioDeSalida,
        lugarDeSalida,
        lugarDeLlegada,
        idConductor: conductorId,
        idSolicitudViaje: requestId
      })
      .select(TRIP_COLUMNS_FALLBACK)
      .single();

    if (fallbackError) throw fallbackError;
    return { lugaresDisponibles: 0, descripcionAuto: '', patenteAuto: '', ...fallbackData };
  }

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
    .select(REQUEST_COLUMNS)
    .eq('idSolicitante', userId);

  if (error && isMissingRequirementsColumn(error)) {
    const { data: fallbackData = [], error: fallbackError } = await supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .eq('idSolicitante', userId);

    if (fallbackError) throw fallbackError;
    return fallbackData;
  }

  if (error) throw error;
  return data;
}

export async function findTripsByRequestIds(requestIds) {
  if (requestIds.length === 0) return [];
  const { data = [], error } = await supabase
    .from('Viaje')
    .select(TRIP_COLUMNS)
    .in('idSolicitudViaje', requestIds);

  if (error && isMissingTripOptionalColumn(error)) {
    const { data: fallbackData = [], error: fallbackError } = await supabase
      .from('Viaje')
      .select(TRIP_COLUMNS_FALLBACK)
      .in('idSolicitudViaje', requestIds);

    if (fallbackError) throw fallbackError;
    return fallbackData.map((trip) => ({ lugaresDisponibles: 0, descripcionAuto: '', patenteAuto: '', ...trip }));
  }

  if (error) throw error;
  return data;
}

export async function findDriverTrips(userId) {
  const { data = [], error } = await supabase
    .from('Viaje')
    .select(TRIP_COLUMNS)
    .eq('idConductor', userId);

  if (error && isMissingTripOptionalColumn(error)) {
    const { data: fallbackData = [], error: fallbackError } = await supabase
      .from('Viaje')
      .select(TRIP_COLUMNS_FALLBACK)
      .eq('idConductor', userId);

    if (fallbackError) throw fallbackError;
    return fallbackData.map((trip) => ({ lugaresDisponibles: 0, descripcionAuto: '', patenteAuto: '', ...trip }));
  }

  if (error) throw error;
  return data;
}

export async function findRequestsByIds(requestIds) {
  if (requestIds.length === 0) return [];
  const { data = [], error } = await supabase
    .from('solicitudViaje')
    .select(REQUEST_COLUMNS)
    .in('id', requestIds);

  if (error && isMissingRequirementsColumn(error)) {
    const { data: fallbackData = [], error: fallbackError } = await supabase
      .from('solicitudViaje')
      .select(REQUEST_COLUMNS_FALLBACK)
      .in('id', requestIds);

    if (fallbackError) throw fallbackError;
    return fallbackData;
  }

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
