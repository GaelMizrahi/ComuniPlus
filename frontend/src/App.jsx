import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = 'http://localhost:3001';

const TopBar = ({ user }) => (
  <header className="topbar">
    <div className="avatar">{user?.fullName?.[0] || 'C'}</div>
    <div className="brand">Comuni+</div>
  </header>
);

const BottomNav = ({ active }) => {
  const items = ['HOME', 'VIAJES', 'DEPORTES', 'MERCADO', 'PERFIL'];
  return (
    <footer className="bottom-nav-wrap">
      <nav className="bottom-nav">
        {items.map((i) => (
          <span key={i} className={active === i ? 'active' : ''}>{i}</span>
        ))}
      </nav>
    </footer>
  );
};

function Login({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    if (!res.ok) return setError('Credenciales inválidas');
    const data = await res.json();
    onLogin(data.user);
    nav('/home');
  };

  return (
    <main className="mobile auth-bg">
      <div className="logo-center">Comuni+</div>
      <h1 className="auth-title">Bienvenido de nuevo</h1>
      <section className="auth-card">
        <form onSubmit={submit}>
          <label>CORREO ELECTRÓNICO</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@dominio.com" className="field" required />
          <div className="pw-row"><label>CONTRASEÑA</label><a href="#">¿Olvidaste tu contraseña?</a></div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" required />
          <button className="btn blue full">Iniciar sesión</button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
      <p className="foot-auth">¿No tienes cuenta? <a href="#">Regístrate</a></p>
    </main>
  );
}

const Layout = ({ user, onLogout, active, children }) => (
  <main className="mobile app-bg">
    <TopBar user={user} />
    <section className="content">{children}</section>
    <button className="logout" onClick={onLogout}>Cerrar sesión</button>
    <BottomNav active={active} />
  </main>
);

function Home({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="HOME">
      <h2 className="club-title">Club Náutico Hacoaj</h2>
      <p className="club-sub">📍 Sede Tigre, Buenos Aires</p>
      <div className="section-head"><h3>Noticias de la comunidad</h3><span>Ver todas</span></div>
      <div className="news-row">
        <article className="news-card"><div className="img" /><h4>Fiesta de fin de año</h4><p>Vení a disfrutar...</p></article>
        <article className="news-card"><div className="img green" /><h4>Final de fútbol</h4><p>Vení al partido</p></article>
      </div>
      <h3>Secciones</h3>
      <div className="grid2">
        <div className="mod sport">Deportes</div>
        <Link to="/viajes" className="mod transport">Transporte</Link>
        <div className="mod">Ventas</div>
        <div className="mod">Consultas</div>
      </div>
    </Layout>
  );
}

function Viajes({ user, onLogout }) {
  const nav = useNavigate();
  const [rides, setRides] = useState([]);
  const [zone, setZone] = useState('Todos los viajes');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const r = await fetch(`${API_URL}/api/rides?zone=${encodeURIComponent(zone)}`);
    setRides(await r.json());
  };
  useEffect(() => { load(); }, [zone]);

  const offer = async (rideId) => {
    const seats = Number(prompt('¿Cuántas personas llevás? (1-4)', '1'));
    if (!seats || seats < 1 || seats > 4) return setMsg('Debe ser entre 1 y 4');
    const comment = prompt('Comentario del conductor', 'No tengo espacio en el baúl') || '';
    const res = await fetch(`${API_URL}/api/rides/${rideId}/offer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, seats, comment })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.message || 'Error');
    setMsg('Oferta enviada');
    load();
  };

  const chips = ['Todos los viajes', 'Palermo', 'Belgrano'];
  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <div className="section-head"><h1>Carpooling Comunitario</h1><span>Mis reservas</span></div>
      <p className="muted">Conectate con integrantes de tu comunidad para facilitar tu traslado.</p>
      <div className="chips">{chips.map((c) => <button key={c} className={zone === c ? 'active' : ''} onClick={() => setZone(c)}>{c}</button>)}</div>
      {msg && <p className="ok">{msg}</p>}
      {rides.map((r) => (
        <article className="ride-card" key={r.id}>
          <div className="between"><strong>{r.driverName}</strong><span className="time">{r.departureTime}</span></div>
          <p className="seats">🟢 {r.seatsAvailable} LUGARES</p>
          <div className="od"><div><small>DESDE</small><p>{r.origin}</p></div><div><small>HACIA</small><p>{r.destination}</p></div></div>
          <p className="comment">“{r.comment || 'Sin comentario'}”</p>
          <button className="btn blue" onClick={() => offer(r.id)}>Ofrecer lugar</button>
        </article>
      ))}
      <button className="btn green fab" onClick={() => nav('/viajes/solicitar')}>⊕ Pedir viaje</button>
    </Layout>
  );
}

function Solicitar({ user, onLogout }) {
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({ origin: '', destination: '', date: '', departureTime: '', seatsNeeded: 2, comment: '' });
  const ch = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.seatsNeeded < 1 || f.seatsNeeded > 4) return setMsg('Lugares: 1 a 4');
    const res = await fetch(`${API_URL}/api/rides/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, requesterId: user.id })
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.message || 'Error');
    setMsg('Viaje publicado');
  };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <h1>Pedir un viaje</h1>
      <p className="muted">Completa los datos para que otros socios puedan unirse a tu traslado.</p>
      <section className="form-card">
        <form onSubmit={submit}>
          <label>ORIGEN</label><input className="field gray" value={f.origin} onChange={(e) => ch('origin', e.target.value)} required />
          <label>DESTINO</label><input className="field gray" value={f.destination} onChange={(e) => ch('destination', e.target.value)} required />
          <label>FECHA</label><input className="field gray" type="date" value={f.date} onChange={(e) => ch('date', e.target.value)} required />
          <label>HORA DE SALIDA</label><input className="field gray" type="time" value={f.departureTime} onChange={(e) => ch('departureTime', e.target.value)} required />
          <label>LUGARES A BUSCAR</label>
          <div className="counter"><button type="button" onClick={() => ch('seatsNeeded', Math.max(1, f.seatsNeeded - 1))}>−</button><b>{f.seatsNeeded}</b><button type="button" onClick={() => ch('seatsNeeded', Math.min(4, f.seatsNeeded + 1))}>+</button></div>
          <label>COMENTARIOS ADICIONALES</label><textarea className="field gray" value={f.comment} onChange={(e) => ch('comment', e.target.value)} />
          <button className="btn green full">⊕ Pedir viaje</button>
        </form>
      </section>
      {msg && <p className="ok">{msg}</p>}
    </Layout>
  );
}

function Reservas({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const load = async () => {
    const res = await fetch(`${API_URL}/api/reservations?userId=${user.id}`);
    setItems(await res.json());
  };
  useEffect(() => { load(); }, []);
  const cancel = async (id) => { await fetch(`${API_URL}/api/reservations/${id}/cancel`, { method: 'POST' }); load(); };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <h1>Reservas</h1><p className="muted">Gestioná tus reservas y viajes desde un solo lugar.</p>
      <div className="chips"><button className="active">Todas</button><button>Deportes</button><button>Viajes</button></div>
      <h4 className="subh">● PRÓXIMAS RESERVAS</h4>
      {items.map((i) => (
        <article className="res-card" key={i.id}>
          <div className="between"><strong>Viaje a {i.destination}</strong><span className="badge">CONFIRMADO</span></div>
          <p><b>Llevar a:</b> {i.seatsReserved} personas</p>
          <p>{i.origin} → {i.destination}</p>
          <p>{i.date} · {i.departureTime}</p>
          {i.driverComment && <p>Comentario: {i.driverComment}</p>}
          <div className="row"><button className="btn blue">Ver detalle</button><button className="btn light" onClick={() => cancel(i.id)}>Cancelar</button></div>
        </article>
      ))}
      {!items.length && <p>No tenés reservas.</p>}
    </Layout>
  );
}

const Protected = ({ user, children }) => user ? children : <Navigate to="/" replace />;

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('comuni_user') || 'null'));
  const onLogin = (u) => { setUser(u); localStorage.setItem('comuni_user', JSON.stringify(u)); };
  const onLogout = () => { setUser(null); localStorage.removeItem('comuni_user'); };

  return (
    <Routes>
      <Route path="/" element={<Login onLogin={onLogin} />} />
      <Route path="/home" element={<Protected user={user}><Home user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes" element={<Protected user={user}><Viajes user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes/solicitar" element={<Protected user={user}><Solicitar user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/reservas" element={<Protected user={user}><Reservas user={user} onLogout={onLogout} /></Protected>} />
    </Routes>
  );
}
