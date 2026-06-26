import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [rawKey, ...rawValue] = trimmed.split('=');
    const key = rawKey.trim();
    const value = rawValue.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const normalizeSupabaseUrl = (url = '') => url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL ?? '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const jwtSecret = (process.env.JWT_SECRET ?? '').trim();
const port = Number(process.env.PORT || 4000);

if (!supabaseUrl || !supabaseServiceKey || !jwtSecret) {
  throw new Error('Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o JWT_SECRET en backend/.env');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const app = express();
app.use(cors());
app.use(express.json());

const getFullName = (user) => `${user?.nombre ?? ''}${user?.apellido ? ` ${user.apellido}` : ''}`.trim() || 'Usuario';
const asNumber = (value) => Number.parseInt(String(value), 10);
const normalizePhone = (phone) => String(phone ?? '').replace(/[^\d+]/g, '');

function buildWhatsAppLink(phone, message) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
}

function mapSupabaseError(error) {
  if (!error) return null;
  return { message: error.message, code: error.code, details: error.details, hint: error.hint };
}


function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ ok: false, message: 'Token no enviado' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'Formato de token inválido' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
  }
}

async function getAcceptedMembershipByUserId(usuarioId) {
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

async function getUsersByIds(userIds) {
  const ids = [...new Set(userIds.map(asNumber).filter(Number.isFinite))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, mail, telefono')
    .in('id', ids);

  if (error) throw error;
  return Object.fromEntries((data ?? []).map((user) => [user.id, user]));
}

async function getRequestById(rideId) {
  const { data, error } = await supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida')
    .eq('id', rideId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function countRows(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  return error ? { table, ok: false, error: mapSupabaseError(error) } : { table, ok: true, count };
}

function shapeOpenRide(request, requester) {
  return {
    id: request.id,
    requesterId: request.idSolicitante,
    requesterName: getFullName(requester),
    requesterPhone: requester?.telefono ?? null,
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    departureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    seatsNeeded: Number(request.espaciosSolicitados),
    seatsAvailable: Number(request.espaciosSolicitados),
    requested: true
  };
}

function isRideDue(date, time) {
  if (!date || !time) return false;
  const rideDate = new Date(`${date}T${String(time).slice(0, 8)}`);
  if (Number.isNaN(rideDate.getTime())) return false;
  return rideDate <= new Date();
}

function shapeReservation({ trip, request, currentUserId, requester, conductor }) {
  const isPassenger = Number(request.idSolicitante) === Number(currentUserId);
  const otherPerson = isPassenger ? conductor : requester;
  const role = isPassenger ? 'passenger' : 'driver';
  const message = `Hola ${getFullName(otherPerson)}, soy ${isPassenger ? 'la persona que pidió' : 'la persona que aceptó'} la reserva del viaje de ${request.lugarDeSalida} a ${request.lugarDeLlegada}. Me quedó una duda y quería consultarte:`;

  return {
    id: `trip-${trip.id}`,
    tripId: trip.id,
    rideId: request.id,
    role,
    roleLabel: isPassenger ? 'Viaje que pediste' : 'Viaje que aceptaste',
    otherPersonName: getFullName(otherPerson),
    otherContactPhone: otherPerson?.telefono ?? null,
    whatsappLink: buildWhatsAppLink(otherPerson?.telefono, message),
    requesterName: getFullName(requester),
    conductorName: getFullName(conductor),
    origin: request.lugarDeSalida,
    destination: request.lugarDeLlegada,
    departureDate: request.diaSalida,
    departureTime: request.horarioDeSalida,
    seatsReserved: Number(request.espaciosSolicitados),
    status: 'active',
    canComplete: isRideDue(request.diaSalida, request.horarioDeSalida),
    carDescription: trip.descripcionAuto ?? '',
    carPlate: trip.patenteAuto ?? ''
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'comuniplus-backend', db: Boolean(supabaseUrl), auth: Boolean(jwtSecret), port });
});

app.get('/api/debug/supabase', async (_req, res) => {
  try {
    const tables = await Promise.all(['Usuario', 'Comunidad', 'ComunidadUsuario', 'solicitudViaje', 'Viaje', 'ComunidadViaje'].map(countRows));
    res.json({ ok: true, supabaseUrl, tables });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'No se pudo diagnosticar Supabase', detail: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '').trim();
    if (!email || !password) return res.status(400).json({ message: 'Ingresá mail y contraseña' });

    const { data: users, error: userError } = await supabase
      .from('Usuario')
      .select('id, nombre, apellido, mail, contraseña, telefono')
      .ilike('mail', email)
      .limit(1);

    if (userError) throw userError;
    const user = users?.[0];
    if (!user || String(user.contraseña ?? '').trim() !== password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const membership = await getAcceptedMembershipByUserId(user.id);

    const { data: community, error: communityError } = await supabase
      .from('Comunidad')
      .select('id, nombre')
      .eq('id', membership.idComunidad)
      .maybeSingle();

    if (communityError) throw communityError;
    if (!community) return res.status(404).json({ message: 'Comunidad no encontrada' });

    const tokenPayload = {
      idUsuario: user.id,
      mail: user.mail,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      idComunidad: membership.idComunidad,
      idComunidadUsuario: membership.id,
      nroSocio: membership.nroSocio
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

    res.json({
      ok: true,
      message: 'Login correcto',
      token,
      user: {
        id: user.id,
        idUsuario: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        mail: user.mail,
        email: user.mail,
        telefono: user.telefono,
        fullName: getFullName(user),
        idComunidad: membership.idComunidad,
        communityId: membership.idComunidad,
        idComunidadUsuario: membership.id,
        comunidadUsuarioId: membership.id,
        nroSocio: membership.nroSocio,
        community: community.nombre
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en login', detail: error.message });
  }
});

app.get('/api/rides', authMiddleware, async (req, res) => {
  try {
    const zone = String(req.query.zone ?? '').trim();
    let query = supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida')
      .order('id', { ascending: false });

    if (zone && zone !== 'Todos los viajes') {
      query = query.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);
    }

    const { data: requests = [], error } = await query;
    if (error) throw error;

    const requestIds = requests.map((request) => request.id);
    let acceptedRequestIds = new Set();
    if (requestIds.length > 0) {
      const { data: trips = [], error: tripsError } = await supabase
        .from('Viaje')
        .select('idSolicitudViaje')
        .in('idSolicitudViaje', requestIds);
      if (tripsError) throw tripsError;
      acceptedRequestIds = new Set(trips.map((trip) => trip.idSolicitudViaje));
    }

    const usersById = await getUsersByIds(requests.map((request) => request.idSolicitante));
    const payload = requests
      .filter((request) => !acceptedRequestIds.has(request.id))
      .map((request) => shapeOpenRide(request, usersById[request.idSolicitante]));

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar viajes', detail: error.message });
  }
});

app.post('/api/rides/request', authMiddleware, async (req, res) => {
  try {
    const { origin, destination, date, departureTime, seatsNeeded } = req.body;
    const requesterUserId = asNumber(req.user.idUsuario);
    if (!requesterUserId || !origin || !destination || !date || !departureTime || !seatsNeeded) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const seats = asNumber(seatsNeeded);
    if (!Number.isFinite(seats) || seats < 1 || seats > 4) {
      return res.status(400).json({ message: 'Lugares a buscar debe ser entre 1 y 4' });
    }

    await getAcceptedMembershipByUserId(requesterUserId);

    const { data, error } = await supabase
      .from('solicitudViaje')
      .insert({
        espaciosSolicitados: seats,
        horarioDeSalida: departureTime,
        lugarDeSalida: String(origin).trim(),
        lugarDeLlegada: String(destination).trim(),
        idSolicitante: requesterUserId,
        diaSalida: date
      })
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida')
      .single();

    if (error) throw error;
    const usersById = await getUsersByIds([requesterUserId]);
    res.status(201).json(shapeOpenRide(data, usersById[requesterUserId]));
  } catch (error) {
    res.status(500).json({ message: 'Error al pedir viaje', detail: error.message });
  }
});

app.post('/api/rides/:rideId/offer', authMiddleware, async (req, res) => {
  try {
    const rideId = asNumber(req.params.rideId);
    const conductorId = asNumber(req.user.idUsuario);
    if (!rideId || !conductorId) return res.status(400).json({ message: 'Faltan datos para aceptar el viaje' });

    const conductorMembership = await getAcceptedMembershipByUserId(conductorId);
    const request = await getRequestById(rideId);
    if (!request) return res.status(404).json({ message: 'Solicitud de viaje no encontrada' });

    if (Number(request.idSolicitante) === conductorId) {
      return res.status(400).json({ message: 'Esta solicitud es tuya, no puedes aceptarla' });
    }

    const { data: existingTrip, error: existingError } = await supabase
      .from('Viaje')
      .select('id')
      .eq('idSolicitudViaje', request.id)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingTrip) return res.status(400).json({ message: 'Esta solicitud ya fue tomada' });

    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .insert({
        lugaresDisponibles: 0,
        horarioDeSalida: request.horarioDeSalida,
        descripcionAuto: req.body.descripcionAuto ?? null,
        patenteAuto: req.body.patenteAuto ?? null,
        lugarDeSalida: request.lugarDeSalida,
        lugarDeLlegada: request.lugarDeLlegada,
        idConductor: conductorId,
        idSolicitudViaje: request.id
      })
      .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
      .single();

    if (tripError) throw tripError;

    const { error: communityTripError } = await supabase
      .from('ComunidadViaje')
      .insert({ idComunidad: conductorMembership.idComunidad, idViaje: trip.id });
    if (communityTripError) throw communityTripError;

    const usersById = await getUsersByIds([request.idSolicitante, conductorId]);
    res.status(201).json(shapeReservation({
      trip,
      request,
      currentUserId: conductorId,
      requester: usersById[request.idSolicitante],
      conductor: usersById[conductorId]
    }));
  } catch (error) {
    res.status(500).json({ message: 'Error al ofrecer viaje', detail: error.message });
  }
});

app.get('/api/reservations', authMiddleware, async (req, res) => {
  try {
    const currentUserId = asNumber(req.user.idUsuario);
    if (!currentUserId) return res.status(400).json({ message: 'Falta userId' });
    await getAcceptedMembershipByUserId(currentUserId);

    const { data: passengerRequests = [], error: passengerError } = await supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida')
      .eq('idSolicitante', currentUserId);
    if (passengerError) throw passengerError;

    const passengerRequestIds = passengerRequests.map((request) => request.id);
    let passengerTrips = [];
    if (passengerRequestIds.length > 0) {
      const { data, error } = await supabase
        .from('Viaje')
        .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
        .in('idSolicitudViaje', passengerRequestIds);
      if (error) throw error;
      passengerTrips = data ?? [];
    }

    const { data: driverTrips = [], error: driverError } = await supabase
      .from('Viaje')
      .select('id, lugaresDisponibles, horarioDeSalida, descripcionAuto, patenteAuto, lugarDeSalida, lugarDeLlegada, idConductor, idSolicitudViaje')
      .eq('idConductor', currentUserId);
    if (driverError) throw driverError;

    const driverRequestIds = driverTrips.map((trip) => trip.idSolicitudViaje).filter(Boolean);
    let driverRequests = [];
    if (driverRequestIds.length > 0) {
      const { data, error } = await supabase
        .from('solicitudViaje')
        .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante, diaSalida')
        .in('id', driverRequestIds);
      if (error) throw error;
      driverRequests = data ?? [];
    }

    const requestsById = Object.fromEntries([...passengerRequests, ...driverRequests].map((request) => [request.id, request]));
    const allTrips = [...passengerTrips, ...driverTrips];
    const usersById = await getUsersByIds([
      currentUserId,
      ...allTrips.map((trip) => trip.idConductor),
      ...Object.values(requestsById).map((request) => request.idSolicitante)
    ]);

    const seen = new Set();
    const reservations = allTrips
      .filter((trip) => {
        if (seen.has(trip.id)) return false;
        seen.add(trip.id);
        return Boolean(requestsById[trip.idSolicitudViaje]);
      })
      .map((trip) => {
        const request = requestsById[trip.idSolicitudViaje];
        return shapeReservation({
          trip,
          request,
          currentUserId,
          requester: usersById[request.idSolicitante],
          conductor: usersById[trip.idConductor]
        });
      });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar reservas', detail: error.message });
  }
});

app.post('/api/reservations/:reservationId/complete', authMiddleware, async (req, res) => {
  try {
    const tripId = asNumber(String(req.params.reservationId).replace('trip-', '').replace('res-', ''));
    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .select('id, idConductor, idSolicitudViaje')
      .eq('id', tripId)
      .maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return res.status(404).json({ message: 'Reserva no encontrada' });

    const request = await getRequestById(trip.idSolicitudViaje);
    const currentUserId = asNumber(req.user.idUsuario);
    if (!request || (Number(request.idSolicitante) !== currentUserId && Number(trip.idConductor) !== currentUserId)) {
      return res.status(403).json({ message: 'No tenés permiso para modificar esta reserva' });
    }

    await supabase.from('ComunidadViaje').delete().eq('idViaje', trip.id);
    const { error: deleteTripError } = await supabase.from('Viaje').delete().eq('id', trip.id);
    if (deleteTripError) throw deleteTripError;

    const { error: deleteRequestError } = await supabase.from('solicitudViaje').delete().eq('id', trip.idSolicitudViaje);
    if (deleteRequestError) throw deleteRequestError;

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar viaje realizado', detail: error.message });
  }
});

app.post('/api/reservations/:reservationId/cancel', authMiddleware, async (req, res) => {
  try {
    const tripId = asNumber(String(req.params.reservationId).replace('trip-', '').replace('res-', ''));
    const currentUserId = asNumber(req.user.idUsuario);

    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .select('id, idConductor, idSolicitudViaje')
      .eq('id', tripId)
      .maybeSingle();
    if (tripError) throw tripError;
    if (!trip) return res.status(404).json({ message: 'Reserva no encontrada' });

    const request = await getRequestById(trip.idSolicitudViaje);
    if (!request || (Number(request.idSolicitante) !== currentUserId && Number(trip.idConductor) !== currentUserId)) {
      return res.status(403).json({ message: 'No tenés permiso para modificar esta reserva' });
    }

    await supabase.from('ComunidadViaje').delete().eq('idViaje', tripId);
    const { error } = await supabase.from('Viaje').delete().eq('id', tripId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar reserva', detail: error.message });
  }
});

app.post('/api/rides/:rideId/cancel', authMiddleware, async (req, res) => {
  try {
    const rideId = asNumber(req.params.rideId);
    const userId = asNumber(req.user.idUsuario);
    if (!rideId || !userId) return res.status(400).json({ message: 'Faltan datos para cancelar' });
    await getAcceptedMembershipByUserId(userId);

    const { data: trips = [], error: tripLookupError } = await supabase
      .from('Viaje')
      .select('id')
      .eq('idSolicitudViaje', rideId);
    if (tripLookupError) throw tripLookupError;

    const tripIds = trips.map((trip) => trip.id);
    if (tripIds.length > 0) await supabase.from('ComunidadViaje').delete().in('idViaje', tripIds);
    await supabase.from('Viaje').delete().eq('idSolicitudViaje', rideId);

    const { error } = await supabase
      .from('solicitudViaje')
      .delete()
      .eq('id', rideId)
      .eq('idSolicitante', userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar solicitud', detail: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
