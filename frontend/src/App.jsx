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

    </Routes>
  );
}