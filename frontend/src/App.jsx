import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

// Páginas principales
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Viajes from './pages/Viajes.jsx';
import Solicitar from './pages/Solicitar.jsx';
import Reservas from './pages/Reservas.jsx';
import Mercado from './pages/Mercado.jsx';
import Perfil from './pages/Perfil.jsx';

// Deportes
import Deportes from './pages/deportes/Deportes.jsx';
import ReservasDeportivas from './pages/deportes/Reservas.jsx';
import FaltaJugador from './pages/deportes/FaltaJugador.jsx';
import CrearPartido from './pages/deportes/CrearPartido.jsx';
import MisReservas from './pages/deportes/MisReservas.jsx';
import Mercado from './pages/Mercado.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = (token) => ({ 'Content-Type': 'application/json', ...authHeaders(token) });

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
    { key: 'DEPORTES', to: '/deportes' },
    { key: 'MERCADO', to: '/mercado' },
    { key: 'PERFIL', to: '#' }
  ];

/*
|--------------------------------------------------------------------------
| Rutas protegidas
|--------------------------------------------------------------------------
*/

const Protected = ({ user, token, children }) => {
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


/*
|--------------------------------------------------------------------------
| App
|--------------------------------------------------------------------------
*/

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('comuni_user') || 'null'
      );
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem('comuni_token') || ''
  );

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
        <Link to="/deportes" className="mod sport">🏟️<span>Deportes</span></Link>
        <Link to="/viajes" className="mod transport">🚗<span>Transporte</span></Link>
        <Link to="/mercado" className="mod">🛍️<span>Mercado</span></Link>
        <div className="mod">💬<span>Consultas</span></div>
      </div>
    </Layout>
  );
}

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const onLogin = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);

    localStorage.setItem(
      'comuni_user',
      JSON.stringify(newUser)
    );

    localStorage.setItem(
      'comuni_token',
      newToken
    );
  };


  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const onLogout = () => {
    setUser(null);
    setToken('');

    localStorage.removeItem('comuni_user');
    localStorage.removeItem('comuni_token');
  };


  return (
    <Routes>

      {/* ================================================================
          LOGIN
          ================================================================ */}

      <Route
        path="/login"
        element={
          user && token ? (
            <Navigate to="/home" replace />
          ) : (
            <Login onLogin={onLogin} />
          )
        }
      />


      {/* ================================================================
          HOME
          ================================================================ */}

      <Route
        path="/"
        element={
          <Protected user={user} token={token}>
            <Navigate to="/home" replace />
          </Protected>
        }
      />

      <Route
        path="/home"
        element={
          <Protected user={user} token={token}>
            <Home
              user={user}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          VIAJES
          ================================================================ */}

      <Route
        path="/viajes"
        element={
          <Protected user={user} token={token}>
            <Viajes
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />

      <Route
        path="/viajes/solicitar"
        element={
          <Protected user={user} token={token}>
            <Solicitar
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          RESERVAS DE VIAJES
          ================================================================ */}

      <Route
        path="/reservas"
        element={
          <Protected user={user} token={token}>
            <Reservas
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          MERCADO
          ================================================================ */}

      <Route
        path="/mercado"
        element={
          <Protected user={user} token={token}>
            <Mercado
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          PERFIL
          ================================================================ */}

      <Route
        path="/perfil"
        element={
          <Protected user={user} token={token}>
            <Perfil
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          DEPORTES
          ================================================================ */}

      <Route
        path="/deportes"
        element={
          <Protected user={user} token={token}>
            <Deportes
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          RESERVAS DEPORTIVAS
          ================================================================ */}

      <Route
        path="/deportes/reservas"
        element={
          <Protected user={user} token={token}>
            <ReservasDeportivas
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          FALTA JUGADOR
          ================================================================ */}

      <Route
        path="/deportes/falta-jugador"
        element={
          <Protected user={user} token={token}>
            <FaltaJugador
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          CREAR PARTIDO
          ================================================================ */}

      <Route
        path="/deportes/falta-jugador/crear"
        element={
          <Protected user={user} token={token}>
            <CrearPartido
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          MIS RESERVAS DEPORTIVAS
          ================================================================ */}

      <Route
        path="/deportes/mis-reservas"
        element={
          <Protected user={user} token={token}>
            <MisReservas
              user={user}
              token={token}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      {/* ================================================================
          RUTA NO ENCONTRADA
          ================================================================ */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

  return (
    <Routes>
      <Route path="/" element={<Login onLogin={onLogin} />} />
      <Route path="/home" element={<Protected user={user} token={token}><Home user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes" element={<Protected user={user} token={token}><Viajes user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes/solicitar" element={<Protected user={user} token={token}><Solicitar user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/reservas" element={<Protected user={user} token={token}><Reservas user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes" element={<Protected user={user} token={token}><Deportes user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route path="/deportes/mis-reservas" element={<Protected user={user} token={token}><MisReservas user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route path="/mercado" element={<Protected user={user} token={token}><Mercado user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route path="/mercado/productos/:productId" element={<Protected user={user} token={token}><Mercado user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
    </Routes>
  );
}