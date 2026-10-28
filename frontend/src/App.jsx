import { apiFetch } from './services/api.js';
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

// Páginas principales
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import SolicitudesAcceso from './pages/SolicitudesAcceso.jsx';
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

/*
|--------------------------------------------------------------------------
| Rutas protegidas
|--------------------------------------------------------------------------
*/

const Protected = ({ user, children }) => {
  if (!user) {
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [logoutError, setLogoutError] = useState('');

  const restoreSession = useCallback(async (signal) => {
    try {
      const response = await apiFetch('/api/session', { signal });
      if (response.status === 401) { setUser(null); setSessionError(''); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo recuperar la sesión');
      setUser(data.user); setSessionError('');
    } catch (error) {
      if (error.name !== 'AbortError') setSessionError(error.message || 'No se pudo conectar con el servidor');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    // Remove credentials saved by earlier app versions. Never persist new sessions.
    try { for (const key of ['comuni_token', 'comuni_user', 'token', 'authToken', 'accessToken']) localStorage.removeItem(key); } catch {}
    const abort = new AbortController();
    restoreSession(abort.signal);
    const expired = () => { setUser(null); setSessionError(''); };
    window.addEventListener('session-expired', expired);
    return () => { abort.abort(); window.removeEventListener('session-expired', expired); };
  }, [restoreSession]);

  const onLogin = (newUser) => { setUser(newUser); setSessionError(''); setLogoutError(''); };
  const onLogout = useCallback(async () => {
    setLogoutError('');
    try {
      const response = await apiFetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo cerrar sesión. Reintentá.');
      setUser(null); setSessionError('');
    } catch { setLogoutError('No se pudo cerrar sesión. Revisá la conexión y reintentá.'); }
  }, []);

  if (loading) return <main className="p-8" role="status">Cargando sesión…</main>;
  if (sessionError) return <main className="p-8"><p role="alert">{sessionError}</p><button className="btn blue mt-4" onClick={() => { setLoading(true); restoreSession(); }}>Reintentar</button></main>;


  return (
    <>
    {logoutError && <p role="alert" className="error p-4">{logoutError}</p>}
    <Routes>
      <Route path="/registro" element={user ? <Navigate to="/home" replace /> : <Registro />} />
      <Route path="/solicitudes-acceso" element={<Protected user={user}><SolicitudesAcceso user={user} onLogout={onLogout}/></Protected>} />

      {/* ================================================================
          LOGIN
          ================================================================ */}

      <Route
        path="/login"
        element={
          user ? (
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
          <Protected user={user}>
            <Navigate to="/home" replace />
          </Protected>
        }
      />

      <Route
        path="/home"
        element={
          <Protected user={user}>
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
          <Protected user={user}>
            <Viajes
              user={user}
              onLogout={onLogout}
            />
          </Protected>
        }
      />

      <Route
        path="/viajes/solicitar"
        element={
          <Protected user={user}>
            <Solicitar
              user={user}
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
          <Protected user={user}>
            <Reservas
              user={user}
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
          <Protected user={user}>
            <Mercado
              user={user}
              onLogout={onLogout}
            />
          </Protected>
        }
      />


      <Route
        path="/mercado/productos/:productId"
        element={
          <Protected user={user}>
            <Mercado user={user} onLogout={onLogout} />
          </Protected>
        }
      />

      {/* ================================================================
          PERFIL
          ================================================================ */}

      <Route
        path="/perfil"
        element={
          <Protected user={user}>
            <Perfil
              user={user}
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
          <Protected user={user}>
            <Deportes
              user={user}
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
          <Protected user={user}>
            <ReservasDeportivas
              user={user}
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
          <Protected user={user}>
            <FaltaJugador
              user={user}
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
          <Protected user={user}>
            <CrearPartido
              user={user}
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
          <Protected user={user}>
            <MisReservas
              user={user}
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

    </Routes>
    </>
  );
}
