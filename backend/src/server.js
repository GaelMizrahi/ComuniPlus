import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

const supabase = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '');

async function getComunidadUsuarioIdByUsuarioId(usuarioId) {
  const { data, error } = await supabase
    .from('ComunidadUsuario')
    .select('id')
    .eq('idUsuario', usuarioId)
    .eq('aceptado', true)
    .limit(1)
    .single();

  if (error) throw error;
  return data.id;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'comuniplus-backend', db: !!supabaseUrl });
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error: userError } = await supabase
      .from('Usuario')
      .select('id, nombre, apellido, mail, contraseña')
      .eq('mail', email)
      .eq('contraseña', password)
      .limit(1)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const { data: membership, error: membershipError } = await supabase
      .from('ComunidadUsuario')
      .select('id, idComunidad, nroSocio, aceptado')
      .eq('idUsuario', user.id)
      .eq('aceptado', true)
      .limit(1)
      .single();

    if (membershipError || !membership) return res.status(403).json({ message: 'Usuario sin comunidad aceptada' });

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
        fullName: `${user.nombre}${user.apellido ? ` ${user.apellido}` : ''}`,
        email: user.mail,
        community: comunidad.nombre,
        nroSocio: membership.nroSocio
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en login', detail: error.message });
  }
});

app.get('/api/rides', async (req, res) => {
  try {
    const { zone } = req.query;

    let query = supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
      .order('id', { ascending: false });

    if (zone && zone !== 'Todos los viajes') query = query.or(`lugarDeSalida.ilike.%${zone}%,lugarDeLlegada.ilike.%${zone}%`);

    const { data: requests, error } = await query;
    if (error) throw error;

    const requestIds = requests.map((r) => r.id);
    let acceptedIds = new Set();
    if (requestIds.length > 0) {
      const { data: trips, error: tripsError } = await supabase
        .from('Viaje')
        .select('idSolicitudViaje')
        .in('idSolicitudViaje', requestIds);
      if (tripsError) throw tripsError;
      acceptedIds = new Set(trips.map((t) => t.idSolicitudViaje));
    }

    const solicitanteIds = [...new Set(requests.map((r) => r.idSolicitante).filter(Boolean))];
    let memberById = {};
    if (solicitanteIds.length > 0) {
      const { data: members, error: membersError } = await supabase
        .from('ComunidadUsuario')
        .select('id, idUsuario')
        .in('id', solicitanteIds);
      if (membersError) throw membersError;

      const usuarioIds = [...new Set(members.map((m) => m.idUsuario).filter(Boolean))];
      const { data: users, error: usersError } = await supabase
        .from('Usuario')
        .select('id, nombre, apellido')
        .in('id', usuarioIds);
      if (usersError) throw usersError;

      const userById = Object.fromEntries(users.map((u) => [u.id, u]));
      memberById = Object.fromEntries(
        members.map((m) => [m.id, userById[m.idUsuario]]).filter(([, u]) => !!u)
      );
    }

    const payload = requests.map((r) => {
      const u = memberById[r.idSolicitante];
      return {
        id: r.id,
        driverId: r.idSolicitante,
        driverName: u ? `${u.nombre}${u.apellido ? ` ${u.apellido}` : ''}` : 'Usuario',
        origin: r.lugarDeSalida,
        destination: r.lugarDeLlegada,
        departureTime: r.horarioDeSalida,
        seatsAvailable: Number(r.espaciosSolicitados),
        comment: '',
        requested: true,
        accepted: acceptedIds.has(r.id)
      };
    }).filter((r) => !r.accepted);

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar viajes', detail: error.message });
  }
});

app.post('/api/rides/request', async (req, res) => {
  try {
    const { requesterId, origin, destination, departureTime, seatsNeeded } = req.body;
    if (!requesterId || !origin || !destination || !departureTime || !seatsNeeded) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }
    if (Number(seatsNeeded) < 1 || Number(seatsNeeded) > 4) {
      return res.status(400).json({ message: 'Lugares a buscar debe ser entre 1 y 4' });
    }

    const comunidadUsuarioId = await getComunidadUsuarioIdByUsuarioId(requesterId);

    const { data, error } = await supabase
      .from('solicitudViaje')
      .insert({
        espaciosSolicitados: Number(seatsNeeded),
        horarioDeSalida: departureTime,
        lugarDeSalida: origin,
        lugarDeLlegada: destination,
        idSolicitante: comunidadUsuarioId
      })
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
      .single();

    if (error) throw error;

    return res.status(201).json({
      id: data.id,
      driverId: data.idSolicitante,
      origin: data.lugarDeSalida,
      destination: data.lugarDeLlegada,
      departureTime: data.horarioDeSalida,
      seatsAvailable: data.espaciosSolicitados,
      requested: true
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al pedir viaje', detail: error.message });
  }
});

app.post('/api/rides/:rideId/offer', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { userId, comment = '' } = req.body;

    const conductorComunidadUsuarioId = await getComunidadUsuarioIdByUsuarioId(userId);

    const { data: request, error: requestError } = await supabase
      .from('solicitudViaje')
      .select('id, espaciosSolicitados, horarioDeSalida, lugarDeSalida, lugarDeLlegada, idSolicitante')
      .eq('id', rideId)
      .single();
    if (requestError || !request) return res.status(404).json({ message: 'Viaje no encontrado' });

    if (request.idSolicitante === conductorComunidadUsuarioId) {
      return res.status(400).json({ message: 'Esta solicitud es tuya, no puedes aceptarla' });
    }

    const { data: existingTrip } = await supabase
      .from('Viaje')
      .select('id')
      .eq('idSolicitudViaje', request.id)
      .limit(1)
      .maybeSingle();

    if (existingTrip) return res.status(400).json({ message: 'Esta solicitud ya fue tomada' });

    const { data: trip, error: tripError } = await supabase
      .from('Viaje')
      .insert({
        lugaresDisponibles: Math.max(0, Number(request.espaciosSolicitados) - 1),
        horarioDeSalida: request.horarioDeSalida,
        descripcionAuto: comment,
        lugarDeSalida: request.lugarDeSalida,
        lugarDeLlegada: request.lugarDeLlegada,
        idConductor: conductorComunidadUsuarioId,
        idSolicitudViaje: request.id
      })
      .select('id')
      .single();
    if (tripError) throw tripError;

    return res.status(201).json({
      id: `res-${trip.id}`,
      rideId: request.id,
      passengerId: request.idSolicitante,
      origin: request.lugarDeSalida,
      destination: request.lugarDeLlegada,
      departureTime: request.horarioDeSalida,
      seatsReserved: 1,
      driverComment: comment,
      status: 'active'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al ofrecer viaje', detail: error.message });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const { userId } = req.query;
    const comunidadUsuarioId = await getComunidadUsuarioIdByUsuarioId(Number(userId));

    const { data: solicitudes, error: solError } = await supabase
      .from('solicitudViaje')
      .select('id, lugarDeSalida, lugarDeLlegada, horarioDeSalida, idSolicitante')
      .eq('idSolicitante', comunidadUsuarioId);
    if (solError) throw solError;

    const solIds = solicitudes.map((s) => s.id);
    if (solIds.length === 0) return res.json([]);

    const { data: viajes, error: viajeError } = await supabase
      .from('Viaje')
      .select('id, idSolicitudViaje, descripcionAuto')
      .in('idSolicitudViaje', solIds);
    if (viajeError) throw viajeError;

    const bySol = Object.fromEntries(solicitudes.map((s) => [s.id, s]));

    return res.json(
      viajes.map((v) => ({
        id: `res-${v.id}`,
        rideId: v.idSolicitudViaje,
        origin: bySol[v.idSolicitudViaje]?.lugarDeSalida,
        destination: bySol[v.idSolicitudViaje]?.lugarDeLlegada,
        departureTime: bySol[v.idSolicitudViaje]?.horarioDeSalida,
        seatsReserved: 1,
        driverComment: v.descripcionAuto,
        status: 'active'
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: 'Error al listar reservas', detail: error.message });
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
    return res.status(500).json({ message: 'Error al cancelar reserva', detail: error.message });
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
    return res.status(500).json({ message: 'Error al cancelar solicitud', detail: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
