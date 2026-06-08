import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const requirementOptions = [
  'Tengo silla de ruedas',
  'Llevo una valija',
  'Llevo bolso/mochila grande',
  'Viajo con mascota',
  'Necesito espacio extra'
];

const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'Sin fecha';
const formatTime = (time) => time ? String(time).slice(0, 5) : '--:--';

const TopBar = ({ user }) => (
  <header className="topbar">
    <div className="avatar">{user?.fullName?.[0] || 'C'}</div>
    <Link to="/home" className="brand">Comuni+</Link>
    {user?.fullName && <span className="top-user">{user.fullName}</span>}
  </header>
);

const BottomNav = ({ active }) => {
  const items = [
    { key: 'HOME', to: '/home' },
    { key: 'VIAJES', to: '/viajes' },
    { key: 'DEPORTES', to: '#' },
    { key: 'MERCADO', to: '#' },
    { key: 'PERFIL', to: '#' }
  ];

  return (
    <footer className="bottom-nav-wrap">
      <nav className="bottom-nav">
        {items.map((item) => item.to === '#'
          ? <span key={item.key} className={active === item.key ? 'active' : ''}>{item.key}</span>
          : <Link key={item.key} to={item.to} className={active === item.key ? 'active' : ''}>{item.key}</Link>)}
      </nav>
    </footer>
  );
};

function Layout({ user, onLogout, active, children }) {
  return (
    <main className="mobile app-bg">
      <TopBar user={user} />
      <section className="content">{children}</section>
      <button className="logout" onClick={onLogout}>Cerrar sesión</button>
      <BottomNav active={active} />
    </main>
  );
}

function Login({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Credenciales inválidas');
      onLogin(data.user);
      nav('/home');
    } catch {
      setError(`No se pudo conectar con el backend (${API_URL})`);
    }
  };

  return (
    <main className="mobile auth-bg">
      <div className="logo-center">Comuni+</div>
      <h1 className="auth-title">Bienvenido de nuevo</h1>
      <section className="auth-card elevated-card">
        <form onSubmit={submit}>
          <label>CORREO ELECTRÓNICO</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@dominio.com" className="field" required />
          <div className="pw-row"><label>CONTRASEÑA</label><a href="#">¿Olvidaste tu contraseña?</a></div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" required />
          <button className="btn blue full">Iniciar sesión</button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  );
}

function Home({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="HOME">
      <section className="hero-card">
        <p className="eyebrow">Tu comunidad</p>
        <h2 className="club-title">{user.community}</h2>
        <p className="club-sub">👋 {user.fullName} · Socio #{user.nroSocio}</p>
      </section>
      <h3>Secciones</h3>
      <div className="grid2">
        <div className="mod sport">🏟️<span>Deportes</span></div>
        <Link to="/viajes" className="mod transport">🚗<span>Transporte</span></Link>
        <div className="mod">🛍️<span>Ventas</span></div>
        <div className="mod">💬<span>Consultas</span></div>
      </div>
    </Layout>
  );
}

function RequirementList({ items = [] }) {
  if (!items.length) return <p className="muted small">Sin requerimientos especiales.</p>;
  return <div className="req-list">{items.map((item) => <span key={item}>✓ {item}</span>)}</div>;
}

function Viajes({ user, onLogout }) {
  const nav = useNavigate();
  const [rides, setRides] = useState([]);
  const [zone, setZone] = useState('Todos los viajes');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const response = await fetch(`${API_URL}/api/rides?zone=${encodeURIComponent(zone)}`);
    const data = await response.json();
    setRides(Array.isArray(data) ? data : []);
    if (!response.ok) setMsg(data.message || 'Error al cargar viajes');
  };

  useEffect(() => { load(); }, [zone]);

  const confirmOffer = async (rideId) => {
    const response = await fetch(`${API_URL}/api/rides/${rideId}/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    const data = await response.json();
    if (!response.ok) return setMsg(data.message || 'Error');
    setMsg('Viaje aceptado. Ya aparece en Mis reservas de ambos usuarios.');
    load();
  };

  const cancelOwn = async (rideId) => {
    const response = await fetch(`${API_URL}/api/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    });
    const data = await response.json();
    if (!response.ok) return setMsg(data.message || 'Error');
    setMsg('Solicitud cancelada');
    load();
  };

  const chips = ['Todos los viajes', 'Palermo', 'Belgrano'];

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <div className="section-head">
        <div><p className="eyebrow">Transporte</p><h1>Carpooling Comunitario</h1></div>
        <Link to="/reservas" className="mini-link">Mis reservas</Link>
      </div>
      <p className="muted">Aceptá viajes viendo primero los requerimientos de la persona que lo pidió.</p>
      <div className="chips">{chips.map((chip) => <button key={chip} className={zone === chip ? 'active' : ''} onClick={() => setZone(chip)}>{chip}</button>)}</div>
      {msg && <p className="ok notice">{msg}</p>}
      {rides.map((ride) => {
        const isMine = ride.requesterId === user.id;
        return (
          <article className="ride-card elevated-card" key={ride.id}>
            <div className="card-top">
              <div><p className="eyebrow">Solicitud de viaje</p><strong>{ride.requesterName || ride.driverName}</strong></div>
              <div className="date-pill"><b>{formatDate(ride.departureDate)}</b><span>{formatTime(ride.departureTime)}</span></div>
            </div>
            <p className="seats">🟢 {ride.seatsAvailable} lugar{ride.seatsAvailable === 1 ? '' : 'es'} solicitado{ride.seatsAvailable === 1 ? '' : 's'}</p>
            <div className="route-box"><span>{ride.origin}</span><b>→</b><span>{ride.destination}</span></div>
            <h4>Requerimientos</h4>
            <RequirementList items={ride.requirements} />
            {isMine ? (
              <div className="action-strip mine">
                <span>Esta solicitud es tuya</span>
                <button className="btn light" onClick={() => cancelOwn(ride.id)}>Cancelar</button>
              </div>
            ) : (
              <div className="accept-panel">
                <p className="muted small">Al ofrecer lugar confirmás que estás de acuerdo con los requerimientos de la solicitud.</p>
                <button className="btn blue full" onClick={() => confirmOffer(ride.id)}>Ofrecer lugar</button>
              </div>
            )}
          </article>
        );
      })}
      {!rides.length && <p className="empty-state">No hay solicitudes activas.</p>}
      <button className="btn green fab" onClick={() => nav('/viajes/solicitar')}>⊕ Pedir viaje</button>
    </Layout>
  );
}

function Solicitar({ user, onLogout }) {
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    date: '',
    departureTime: '',
    seatsNeeded: 2,
    contactPhone: localStorage.getItem('comuni_phone') || '',
    requirements: []
  });

  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleRequirement = (requirement) => change('requirements', form.requirements.includes(requirement)
    ? form.requirements.filter((item) => item !== requirement)
    : [...form.requirements, requirement]);

  const submit = async (event) => {
    event.preventDefault();
    if (form.seatsNeeded < 1 || form.seatsNeeded > 4) return setMsg('Lugares: 1 a 4');
    const response = await fetch(`${API_URL}/api/rides/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, requesterId: user.id })
    });
    const data = await response.json();
    if (!response.ok) return setMsg(data.message || 'Error');
    localStorage.setItem('comuni_phone', form.contactPhone);
    setMsg('Viaje publicado con requerimientos');
  };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <p className="eyebrow">Nueva solicitud</p>
      <h1>Pedir un viaje</h1>
      <p className="muted">Indicá qué necesitás para que quien acepte sepa las condiciones antes de confirmar.</p>
      <section className="form-card elevated-card">
        <form onSubmit={submit}>
          <label>ORIGEN</label>
          <input className="field" value={form.origin} onChange={(e) => change('origin', e.target.value)} required />
          <label>DESTINO</label>
          <input className="field" value={form.destination} onChange={(e) => change('destination', e.target.value)} required />
          <div className="form-grid">
            <div><label>FECHA</label><input className="field" type="date" value={form.date} onChange={(e) => change('date', e.target.value)} required /></div>
            <div><label>HORA</label><input className="field" type="time" value={form.departureTime} onChange={(e) => change('departureTime', e.target.value)} required /></div>
          </div>
          <label>TU WHATSAPP</label>
          <input className="field" value={form.contactPhone} onChange={(e) => change('contactPhone', e.target.value)} placeholder="Ej: 5491123456789" required />
          <label>LUGARES A BUSCAR</label>
          <div className="counter"><button type="button" onClick={() => change('seatsNeeded', Math.max(1, form.seatsNeeded - 1))}>−</button><b>{form.seatsNeeded}</b><button type="button" onClick={() => change('seatsNeeded', Math.min(4, form.seatsNeeded + 1))}>+</button></div>
          <label>REQUERIMIENTOS</label>
          <div className="checks">
            {requirementOptions.map((requirement) => (
              <button type="button" key={requirement} className={form.requirements.includes(requirement) ? 'checked' : ''} onClick={() => toggleRequirement(requirement)}>{form.requirements.includes(requirement) ? '✓' : '+'} {requirement}</button>
            ))}
          </div>
          <button className="btn green full">⊕ Publicar viaje</button>
        </form>
      </section>
      {msg && <p className="ok notice">{msg}</p>}
    </Layout>
  );
}

function Reservas({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const response = await fetch(`${API_URL}/api/reservations?userId=${user.id}`);
    const data = await response.json();
    setItems(Array.isArray(data) ? data : []);
    if (!response.ok) setMsg(data.message || 'Error al cargar reservas');
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    await fetch(`${API_URL}/api/reservations/${id}/cancel`, { method: 'POST' });
    setMsg('Reserva cancelada');
    load();
  };

  const complete = async (id) => {
    await fetch(`${API_URL}/api/reservations/${id}/complete`, { method: 'POST' });
    setMsg('Viaje marcado como realizado');
    load();
  };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      <p className="eyebrow">Panel</p>
      <h1>Mis reservas</h1>
      <p className="muted">Acá aparecen las reservas tanto para quien pidió como para quien aceptó el viaje.</p>
      {msg && <p className="ok notice">{msg}</p>}
      {items.map((item) => (
        <article className="res-card elevated-card" key={`${item.id}-${item.type}`}>
          <div className="card-top">
            <div><p className="eyebrow">{item.type === 'driver' ? 'Vas a llevar a' : 'Te lleva'}</p><strong>{item.otherPersonName}</strong></div>
            <div className="date-pill"><b>{formatDate(item.departureDate)}</b><span>{formatTime(item.departureTime)}</span></div>
          </div>
          <div className="route-box"><span>{item.origin}</span><b>→</b><span>{item.destination}</span></div>
          <p><b>Lugares:</b> {item.seatsReserved}</p>
          <h4>Requerimientos acordados</h4>
          <RequirementList items={item.requirements} />
          <div className="contact-box">
            <span>WhatsApp de {item.otherPersonName}</span>
            <b>{item.otherContactPhone || 'No disponible'}</b>
            {item.whatsappUrl && <a className="btn whatsapp full" href={item.whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
          </div>
          <div className="row">
            <button className="btn light" onClick={() => cancel(item.id)}>Cancelar</button>
            {item.canComplete && <button className="btn green" onClick={() => complete(item.id)}>Viaje realizado</button>}
          </div>
          {!item.canComplete && <p className="muted small">El botón “Viaje realizado” aparece cuando llega la fecha y hora del viaje.</p>}
        </article>
      ))}
      {!items.length && <p className="empty-state">No tenés reservas activas.</p>}
    </Layout>
  );
}

const Protected = ({ user, children }) => user ? children : <Navigate to="/" replace />;

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('comuni_user') || 'null'));
  const onLogin = (newUser) => {
    setUser(newUser);
    localStorage.setItem('comuni_user', JSON.stringify(newUser));
  };
  const onLogout = () => {
    setUser(null);
    localStorage.removeItem('comuni_user');
  };

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
