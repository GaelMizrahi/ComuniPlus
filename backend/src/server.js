import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function normalizeSupabaseUrl(url) {
  return (url ?? '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

function getFullName(user) {
  if (!user) return 'Usuario';
  return `${user.nombre}${user.apellido ? ` ${user.apellido}` : ''}`;
}

function mapSupabaseError(error) {
  if (!error) return undefined;
  return {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  };
}

const META_SEPARATOR = '||COMUNI_META::';

function encodeRequestDestination(destination, meta = {}) {
  const cleanDestination = String(destination ?? '').trim();
  const encodedMeta = Buffer.from(JSON.stringify(meta), 'utf8').toString('base64url');
  return `${cleanDestination}${META_SEPARATOR}${encodedMeta}`;
}

function decodeRequestDestination(rawDestination) {
  const value = String(rawDestination ?? '');
  if (!value.includes(META_SEPARATOR)) {
    return { destination: value, meta: {} };
  }

  const [destination, encodedMeta] = value.split(META_SEPARATOR);
  try {
    return {
      destination,
      meta: JSON.parse(Buffer.from(encodedMeta, 'base64url').toString('utf8'))
    };
  } catch {
    return { destination, meta: {} };
  }
}

function parseTripMeta(rawMeta) {
  if (!rawMeta) return {};
  try {
    return JSON.parse(rawMeta);
  } catch {
    return { driverComment: rawMeta };
  }
}

function normalizeRequirements(requirements) {
  if (!Array.isArray(requirements)) return [];
  return requirements.map((requirement) => String(requirement).trim()).filter(Boolean);
}

function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

function buildWhatsAppLink(phone, message) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function isRideDue(date, time) {
  if (!date || !time) return false;
  const rideDate = new Date(`${date}T${String(time).slice(0, 8)}`);
  if (Number.isNaN(rideDate.getTime())) return false;
  return rideDate <= new Date();
}

loadEnvFile();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
const port = Number.parseInt(process.env.PORT ?? '4000', 10);

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables en backend/.env: completá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY antes de ejecutar npm run dev.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAcceptedMembershipByUserId(usuarioId) {
  const { data, error } = await supabase
    .from('ComunidadUsuario')
    .select('id, idComunidad, idUsuario, aceptado, nroSocio')
    .eq('idUsuario', usuarioId)
    .eq('aceptado', true)
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

async function getComunidadUsuarioIdByUsuarioId(usuarioId) {
  const membership = await getAcceptedMembershipByUserId(usuarioId);
  return membership.id;
}

async function getUsersByMembershipIds(membershipIds) {
  const ids = [...new Set(membershipIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data: memberships, error: membershipsError } = await supabase
    .from('ComunidadUsuario')
    .select('id, idUsuario')
    .in('id', ids);
  if (membershipsError) throw membershipsError;

  const userIds = [...new Set(memberships.map((m) => m.idUsuario).filter(Boolean))];
  if (userIds.length === 0) return {};

  const { data: users, error: usersError } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, mail')
    .in('id', userIds);
  if (usersError) throw usersError;

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  return Object.fromEntries(
    memberships
      .map((membership) => [membership.id, userById[membership.idUsuario]])
      .filter(([, user]) => !!user)
  );
}

async function getRequestById(rideId) {
  const { data, error } = await supabase
    .from('solicitudViaje')
    .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
    .eq('id', rideId)
    .single();

  if (error) throw error;
  return data;
}

function shapeRideRequest(request, requesterUser, acceptedIds = new Set()) {
  const seatsNeeded = Number(request.espaciosSolicitados);
  const { destination, meta } = decodeRequestDestination(request.lugarDeLlegada);
  const requirements = normalizeRequirements(meta.requirements);

  return {
    id: request.id,
    requesterId: requesterUser?.id ?? null,
    requesterMembershipId: request.idSolicitante,
    driverId: requesterUser?.id ?? null,
    driverName: getFullName(requesterUser),
    requesterName: getFullName(requesterUser),
    origin: request.lugarDeSalida,
    destination,
    departureDate: meta.date ?? null,
    departureTime: request.horarioDeSalida,
    seatsAvailable: seatsNeeded,
    seatsNeeded,
    requirements,
    requested: true,
    accepted: acceptedIds.has(request.id)
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'comuniplus-backend', db: !!supabaseUrl, port });
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Faltan email o contraseña' });
    }

    const { data: user, error: userError } = await supabase
      .from('Usuario')
      .select('id, nombre, apellido, mail, contraseña')
      .eq('mail', email)
      .eq('contraseña', password)
      .limit(1)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const membership = await getAcceptedMembershipByUserId(user.id);

    const { data: comunidad, error: comunidadError } = await supabase
      .from('Comunidad')
      .select('id, nombre')
      .eq('id', membership.idComunidad)
      .single();

    if (comunidadError || !comunidad) return res.status(404).json({ message: 'Comunidad no encontrada' });

    return res.json({
      user: {
        id: user.id,
        comunidadUsuarioId: membership.id,
        communityId: comunidad.id,
        fullName: getFullName(user),
        firstName: user.nombre,
        lastName: user.apellido,
        email: user.mail,
        community: comunidad.nombre,
        nroSocio: membership.nroSocio
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en login', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.get('/api/rides', async (req, res) => {
  try {
    const { zone } = req.query;

    let query = supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
      .order('id', { ascending: false });

    if (zone && zone !== 'Todos los viajes') {
      query = query.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);
    }

    const { data: requests = [], error } = await query;
    if (error) throw error;

    const requestIds = requests.map((r) => r.id);
    let acceptedIds = new Set();
    if (requestIds.length > 0) {
      const { data: trips = [], error: tripsError } = await supabase
        .from('Viaje')
        .select('idSolicitudViaje')
        .in('idSolicitudViaje', requestIds);
      if (tripsError) throw tripsError;
      acceptedIds = new Set(trips.map((trip) => trip.idSolicitudViaje));
    }

    const requesterUsersByMembershipId = await getUsersByMembershipIds(requests.map((r) => r.idSolicitante));
    const payload = requests
      .map((request) => shapeRideRequest(request, requesterUsersByMembershipId[request.idSolicitante], acceptedIds))
      .filter((ride) => !ride.accepted);

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar viajes', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.post('/api/rides/request', async (req, res) => {
  try {
    const { requesterId, origin, destination, date, departureTime, seatsNeeded, requirements = [], contactPhone } = req.body;
    if (!requesterId || !origin || !destination || !date || !departureTime || !seatsNeeded || !contactPhone) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    if (Number(seatsNeeded) < 1 || Number(seatsNeeded) > 4) {
      return res.status(400).json({ message: 'Lugares a buscar debe ser entre 1 y 4' });
    }

    const requesterMembership = await getAcceptedMembershipByUserId(requesterId);
    const requestMeta = {
      date,
      requirements: normalizeRequirements(requirements),
      requesterContactPhone: contactPhone
    };

    const { data, error } = await supabase
      .from('solicitudViaje')
      .insert({
        espaciosSolicitados: Number(seatsNeeded),
        horarioDeSalida: departureTime,
        lugarDeSalida: origin,
        lugarDeLlegada: encodeRequestDestination(destination, requestMeta),
        idSolicitante: requesterMembership.id
      })
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
      .single();

    if (error) throw error;

    const requesterUsersByMembershipId = await getUsersByMembershipIds([requesterMembership.id]);
    return res.status(201).json(shapeRideRequest(data, requesterUsersByMembershipId[requesterMembership.id]));
  } catch (error) {
    return res.status(500).json({ message: 'Error al pedir viaje', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.post('/api/rides/:rideId/offer', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ message: 'Falta el usuario conductor' });

    const conductorMembership = await getAcceptedMembershipByUserId(userId);
    const request = await getRequestById(rideId);
    const { destination, meta: requestMeta } = decodeRequestDestination(request.lugarDeLlegada);

    if (request.idSolicitante === conductorMembership.id) {
      return res.status(400).json({ message: 'Esta solicitud es tuya, no puedes aceptarla' });
    }

    const { data: existingTrip, error: existingTripError } = await supabase
      .from('Viaje')
      .select('id')
      .eq('idSolicitudViaje', request.id)
      .limit(1)
      .maybeSingle();
    if (existingTripError) throw existingTripError;

    if (existingTrip) return res.status(400).json({ message: 'Esta solicitud ya fue tomada' });

    const seatsReserved = Number(request.espaciosSolicitados);
    const tripMeta = {
      date: requestMeta.date ?? null,
      requirements: normalizeRequirements(requestMeta.requirements),
      requesterContactPhone: requestMeta.requesterContactPhone ?? '',
      driverContactPhone: ''
    };
    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .insert({
        lugaresDisponibles: 0,
        horarioDeSalida: request.horarioDeSalida,
        descripcionAuto: JSON.stringify(tripMeta),
        lugarDeSalida: request.lugarDeSalida,
        lugarDeLlegada: destination,
        idConductor: conductorMembership.id,
        idSolicitudViaje: request.id
      })
      .select('id, idConductor, idSolicitudViaje, descripcionAuto')
      .single();
    if (tripError) throw tripError;

    const usersByMembershipId = await getUsersByMembershipIds([request.idSolicitante, conductorMembership.id]);
    const passenger = usersByMembershipId[request.idSolicitante];
    const driver = usersByMembershipId[conductorMembership.id];

    return res.status(201).json({
      id: `res-${trip.id}`,
      type: 'driver',
      rideId: request.id,
      passengerId: passenger?.id ?? null,
      passengerName: getFullName(passenger),
      driverId: driver?.id ?? null,
      driverName: getFullName(driver),
      origin: request.lugarDeSalida,
      destination,
      departureDate: tripMeta.date,
      departureTime: request.horarioDeSalida,
      seatsReserved,
      requirements: tripMeta.requirements,
      status: 'active'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al ofrecer viaje', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'Falta userId' });

    const membership = await getAcceptedMembershipByUserId(Number(userId));

    const { data: passengerRequests = [], error: passengerRequestsError } = await supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, lugarDeSalida, lugarDeLlegada, horarioDeSalida, idSolicitante')
      .eq('idSolicitante', membership.id);
    if (passengerRequestsError) throw passengerRequestsError;

    const passengerRequestIds = passengerRequests.map((request) => request.id);
    let passengerTrips = [];
    if (passengerRequestIds.length > 0) {
      const { data, error } = await supabase
        .from('Viaje')
        .select('id, idSolicitudViaje, idConductor, descripcionAuto')
        .in('idSolicitudViaje', passengerRequestIds);
      if (error) throw error;
      passengerTrips = data;
    }

    const { data: driverTrips = [], error: driverTripsError } = await supabase
      .from('Viaje')
      .select('id, idSolicitudViaje, idConductor, descripcionAuto')
      .eq('idConductor', membership.id);
    if (driverTripsError) throw driverTripsError;

    const driverRequestIds = driverTrips.map((trip) => trip.idSolicitudViaje).filter(Boolean);
    let driverRequests = [];
    if (driverRequestIds.length > 0) {
      const { data, error } = await supabase
        .from('solicitudViaje')
        .select('id, espaciosSolicitados, lugarDeSalida, lugarDeLlegada, horarioDeSalida, idSolicitante')
        .in('id', driverRequestIds);
      if (error) throw error;
      driverRequests = data;
    }

    const allMembershipIds = [
      membership.id,
      ...passengerTrips.map((trip) => trip.idConductor),
      ...driverRequests.map((request) => request.idSolicitante)
    ];
    const usersByMembershipId = await getUsersByMembershipIds(allMembershipIds);
    const passengerRequestById = Object.fromEntries(passengerRequests.map((request) => [request.id, request]));
    const driverRequestById = Object.fromEntries(driverRequests.map((request) => [request.id, request]));

    const message = 'Hola, soy la otra persona de la reserva del viaje en Comuni+. Me quedó una duda y quería consultarte:';

    const asPassenger = passengerTrips.map((trip) => {
      const request = passengerRequestById[trip.idSolicitudViaje];
      const { destination, meta: requestMeta } = decodeRequestDestination(request?.lugarDeLlegada);
      const tripMeta = { ...requestMeta, ...parseTripMeta(trip.descripcionAuto) };
      const driver = usersByMembershipId[trip.idConductor];
      const passenger = usersByMembershipId[membership.id];
      const otherContactPhone = tripMeta.driverContactPhone ?? '';
      return {
        id: `res-${trip.id}`,
        type: 'passenger',
        rideId: trip.idSolicitudViaje,
        passengerId: passenger?.id ?? null,
        passengerName: getFullName(passenger),
        driverId: driver?.id ?? null,
        driverName: getFullName(driver),
        otherPersonName: getFullName(driver),
        otherContactPhone,
        whatsappUrl: buildWhatsAppLink(otherContactPhone, message),
        origin: request?.lugarDeSalida,
        destination,
        departureDate: tripMeta.date ?? null,
        departureTime: request?.horarioDeSalida,
        seatsReserved: Number(request?.espaciosSolicitados ?? 1),
        requirements: normalizeRequirements(tripMeta.requirements),
        canComplete: isRideDue(tripMeta.date, request?.horarioDeSalida),
        status: 'active'
      };
    });

    const asDriver = driverTrips.map((trip) => {
      const request = driverRequestById[trip.idSolicitudViaje];
      const { destination, meta: requestMeta } = decodeRequestDestination(request?.lugarDeLlegada);
      const tripMeta = { ...requestMeta, ...parseTripMeta(trip.descripcionAuto) };
      const passenger = usersByMembershipId[request?.idSolicitante];
      const driver = usersByMembershipId[membership.id];
      const otherContactPhone = tripMeta.requesterContactPhone ?? '';
      return {
        id: `res-${trip.id}`,
        type: 'driver',
        rideId: trip.idSolicitudViaje,
        passengerId: passenger?.id ?? null,
        passengerName: getFullName(passenger),
        driverId: driver?.id ?? null,
        driverName: getFullName(driver),
        otherPersonName: getFullName(passenger),
        otherContactPhone,
        whatsappUrl: buildWhatsAppLink(otherContactPhone, message),
        origin: request?.lugarDeSalida,
        destination,
        departureDate: tripMeta.date ?? null,
        departureTime: request?.horarioDeSalida,
        seatsReserved: Number(request?.espaciosSolicitados ?? 1),
        requirements: normalizeRequirements(tripMeta.requirements),
        canComplete: isRideDue(tripMeta.date, request?.horarioDeSalida),
        status: 'active'
      };
    });

    return res.json([...asPassenger, ...asDriver]);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar reservas', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.post('/api/reservations/:reservationId/complete', async (req, res) => {
  try {
    const { reservationId } = req.params;
    const tripId = String(reservationId).replace('res-', '');

    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .select('id, idSolicitudViaje')
      .eq('id', tripId)
      .single();
    if (tripError || !trip) return res.status(404).json({ message: 'Reserva no encontrada' });

    const { error: deleteTripError } = await supabase.from('Viaje').delete().eq('id', tripId);
    if (deleteTripError) throw deleteTripError;

    const { error: deleteRequestError } = await supabase.from('solicitudViaje').delete().eq('id', trip.idSolicitudViaje);
    if (deleteRequestError) throw deleteRequestError;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al marcar viaje realizado', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.post('/api/reservations/:reservationId/cancel', async (req, res) => {
  try {
    const { reservationId } = req.params;
    const tripId = String(reservationId).replace('res-', '');

    const { error } = await supabase.from('Viaje').delete().eq('id', tripId);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al cancelar reserva', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.post('/api/rides/:rideId/cancel', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { userId } = req.body;
    const comunidadUsuarioId = await getComunidadUsuarioIdByUsuarioId(userId);

    await supabase.from('Viaje').delete().eq('idSolicitudViaje', rideId);
    const { error } = await supabase
      .from('solicitudViaje')
      .delete()
      .eq('id', rideId)
      .eq('idSolicitante', comunidadUsuarioId);

    if (error) throw error;
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error al cancelar solicitud', detail: error.message, supabase: mapSupabaseError(error) });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
