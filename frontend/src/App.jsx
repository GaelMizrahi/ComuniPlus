import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3001';

function Layout({ user, children }) {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 16, fontFamily: 'Arial' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>{user.fullName}</div>
        <div>{user.community}</div>
      </header>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Link to="/home">Home</Link>
        <Link to="/viajes">Viajes</Link>
        <Link to="/viajes/solicitar">Pedir viaje</Link>
        <Link to="/reservas">Reservas</Link>
      </nav>
      {children}
    </main>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setError('Credenciales inválidas');
      return;
    }
    const data = await res.json();
    onLogin(data.user);
    navigate('/home');
  };

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', fontFamily: 'Arial' }}>
      <h1>Comuni+ Login</h1>
      <p>Usuarios demo: andres@comuni.plus / mili@comuni.plus / tomas@comuni.plus (clave: 123456)</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Iniciar sesión</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  );
}

function Home({ user }) {
  return (
    <Layout user={user}>
      <h2>Landing del usuario (hardcodeada)</h2>
      <p>Noticias, eventos y secciones hardcodeadas para MVP.</p>
      <ul>
        <li>Noticias de la comunidad</li><li>Accesos rápidos</li><li>Próximos eventos</li>
      </ul>
    </Layout>
  );
}

function Viajes({ user }) {
  const [rides, setRides] = useState([]);
  const [zone, setZone] = useState('Todos los viajes');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const query = zone ? `?zone=${encodeURIComponent(zone)}` : '';
    const res = await fetch(`${API_URL}/api/rides${query}`);
    const data = await res.json();
    setRides(data);
  };

  useEffect(() => { load(); }, [zone]);

  const offerSeat = async (rideId) => {
    setMsg('');
    const res = await fetch(`${API_URL}/api/rides/${rideId}/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.message || 'Error al reservar');
    setMsg('¡Reserva realizada!');
    load();
  };

  const zones = useMemo(() => ['Todos los viajes', 'Belgrano', 'Palermo', 'Hacoaj'], []);

  return (
    <Layout user={user}>
      <h2>Carpooling Comunitario</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {zones.map((z) => (
          <button key={z} onClick={() => setZone(z)} style={{ fontWeight: z === zone ? 'bold' : 'normal' }}>{z}</button>
        ))}
      </div>
      {msg && <p>{msg}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {rides.map((ride) => (
          <article key={ride.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <strong>{ride.driverName}</strong>
            <p>{ride.origin} → {ride.destination}</p>
            <p>{ride.date} {ride.departureTime} | Lugares: {ride.seatsAvailable}</p>
            {ride.comment && <p>Comentario: {ride.comment}</p>}
            <button onClick={() => offerSeat(ride.id)}>Ofrecer lugar</button>
          </article>
        ))}
      </div>
    </Layout>
  );
}

function SolicitarViaje({ user }) {
  const [form, setForm] = useState({ origin: '', destination: '', date: '', departureTime: '', seatsNeeded: 1, comment: '' });
  const [msg, setMsg] = useState('');
  const change = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    const res = await fetch(`${API_URL}/api/rides/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, requesterId: user.id })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.message || 'Error');
    setMsg('Viaje publicado correctamente');
    setForm({ origin: '', destination: '', date: '', departureTime: '', seatsNeeded: 1, comment: '' });
  };

  return (
    <Layout user={user}>
      <h2>Pedir un viaje</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Origen" value={form.origin} onChange={(e) => change('origin', e.target.value)} required />
        <input placeholder="Destino" value={form.destination} onChange={(e) => change('destination', e.target.value)} required />
        <input type="date" value={form.date} onChange={(e) => change('date', e.target.value)} required />
        <input type="time" value={form.departureTime} onChange={(e) => change('departureTime', e.target.value)} required />
        <input type="number" min="1" value={form.seatsNeeded} onChange={(e) => change('seatsNeeded', Number(e.target.value))} required />
        <textarea placeholder="Comentarios" value={form.comment} onChange={(e) => change('comment', e.target.value)} />
        <button type="submit">Pedir viaje</button>
      </form>
      {msg && <p>{msg}</p>}
    </Layout>
  );
}

function Reservas({ user }) {
  const [reservas, setReservas] = useState([]);

  const load = async () => {
    const res = await fetch(`${API_URL}/api/reservations?userId=${user.id}`);
    setReservas(await res.json());
  };

  useEffect(() => { load(); }, []);

  const cancelar = async (id) => {
    await fetch(`${API_URL}/api/reservations/${id}/cancel`, { method: 'POST' });
    load();
  };

  return (
    <Layout user={user}>
      <h2>Mis reservas (viajes)</h2>
      {reservas.length === 0 && <p>No tenés reservas activas.</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {reservas.map((r) => (
          <article key={r.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <strong>{r.driverName}</strong>
            <p>{r.origin} → {r.destination}</p>
            <p>{r.date} {r.departureTime}</p>
            <button onClick={() => cancelar(r.id)}>Cancelar</button>
          </article>
        ))}
      </div>
    </Layout>
  );
}

function Protected({ user, children }) {
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('comuni_user');
    return raw ? JSON.parse(raw) : null;
  });

  const onLogin = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('comuni_user', JSON.stringify(nextUser));
  };

  return (
    <Routes>
      <Route path="/" element={<Login onLogin={onLogin} />} />
      <Route path="/home" element={<Protected user={user}><Home user={user} /></Protected>} />
      <Route path="/viajes" element={<Protected user={user}><Viajes user={user} /></Protected>} />
      <Route path="/viajes/solicitar" element={<Protected user={user}><SolicitarViaje user={user} /></Protected>} />
      <Route path="/reservas" element={<Protected user={user}><Reservas user={user} /></Protected>} />
    </Routes>
  );
}
