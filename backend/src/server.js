import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const users = [
  { id: 'u1', email: 'andres@comuni.plus', password: '123456', fullName: 'Andres Perel', community: 'Club Náutico Hacoaj' },
  { id: 'u2', email: 'mili@comuni.plus', password: '123456', fullName: 'Milagros Cohen', community: 'Club Náutico Hacoaj' },
  { id: 'u3', email: 'tomas@comuni.plus', password: '123456', fullName: 'Tomás Dayan', community: 'Club Náutico Hacoaj' }
];

const rides = [
  {
    id: 'r1',
    driverId: 'u2',
    driverName: 'Milagros Cohen',
    origin: 'Belgrano',
    destination: 'Club Náutico Hacoaj',
    date: '2026-05-20',
    departureTime: '18:00',
    seatsAvailable: 2,
    comment: 'Puedo esperar 10 minutos',
    status: 'open'
  }
];

const reservations = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'comuniplus-backend' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      community: user.community
    }
  });
});

app.get('/api/rides', (req, res) => {
  const { zone } = req.query;
  const openRides = rides.filter((r) => r.status === 'open' && r.seatsAvailable > 0);
  const filtered = zone && zone !== 'Todos los viajes'
    ? openRides.filter((r) => r.origin.includes(zone) || r.destination.includes(zone))
    : openRides;
  res.json(filtered);
});

app.post('/api/rides/request', (req, res) => {
  const { requesterId, origin, destination, date, departureTime, seatsNeeded, comment } = req.body;
  if (!requesterId || !origin || !destination || !date || !departureTime || !seatsNeeded) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  const requester = users.find((u) => u.id === requesterId);
  const newRide = {
    id: `r${rides.length + 1}`,
    driverId: requesterId,
    driverName: requester?.fullName || 'Usuario',
    origin,
    destination,
    date,
    departureTime,
    seatsAvailable: Number(seatsNeeded),
    comment: comment || '',
    status: 'open',
    requested: true
  };

  rides.unshift(newRide);
  res.status(201).json(newRide);
});

app.post('/api/rides/:rideId/offer', (req, res) => {
  const { rideId } = req.params;
  const { userId } = req.body;

  const ride = rides.find((r) => r.id === rideId);
  if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
  if (ride.seatsAvailable < 1) return res.status(400).json({ message: 'No hay lugares disponibles' });

  const exists = reservations.find((r) => r.rideId === rideId && r.passengerId === userId && r.status === 'active');
  if (exists) return res.status(400).json({ message: 'Ya tenés una reserva activa en este viaje' });

  ride.seatsAvailable -= 1;
  const reservation = {
    id: `res${reservations.length + 1}`,
    rideId,
    passengerId: userId,
    driverName: ride.driverName,
    origin: ride.origin,
    destination: ride.destination,
    date: ride.date,
    departureTime: ride.departureTime,
    seatsReserved: 1,
    status: 'active'
  };
  reservations.unshift(reservation);
  res.status(201).json(reservation);
});

app.get('/api/reservations', (req, res) => {
  const { userId } = req.query;
  const list = reservations.filter((r) => r.passengerId === userId && r.status === 'active');
  res.json(list);
});

app.post('/api/reservations/:reservationId/cancel', (req, res) => {
  const { reservationId } = req.params;
  const reservation = reservations.find((r) => r.id === reservationId && r.status === 'active');
  if (!reservation) return res.status(404).json({ message: 'Reserva no encontrada' });

  reservation.status = 'cancelled';
  const ride = rides.find((r) => r.id === reservation.rideId);
  if (ride) ride.seatsAvailable += reservation.seatsReserved;

  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
