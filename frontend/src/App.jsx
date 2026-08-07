import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Viajes from './pages/Viajes.jsx';
import Solicitar from './pages/Solicitar.jsx';
import Reservas from './pages/Reservas.jsx';
import Mercado from './pages/Mercado.jsx';
import Perfil from './pages/Perfil.jsx';
import Deportes from './pages/deportes/Deportes.jsx';
import ReservasDeportivas from './pages/deportes/Reservas.jsx';
import FaltaJugador from './pages/deportes/FaltaJugador.jsx';
import CrearPartido from './pages/deportes/CrearPartido.jsx';
import MisReservas from './pages/deportes/MisReservas.jsx';

const Protected = ({ user, token, children }) => user && token ? children : <Navigate to="/" replace />;

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('comuni_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('comuni_token') || '');

  const onLogin = (newUser, newToken) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('comuni_user', JSON.stringify(newUser));
    localStorage.setItem('comuni_token', newToken);
  };

  const onLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('comuni_user');
    localStorage.removeItem('comuni_token');
  };

  return (
    <Routes>
      <Route path="/" element={<Login onLogin={onLogin} />} />
      <Route path="/home" element={<Protected user={user} token={token}><Home user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes" element={<Protected user={user} token={token}><Viajes user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/viajes/solicitar" element={<Protected user={user} token={token}><Solicitar user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/reservas" element={<Protected user={user} token={token}><Reservas user={user} token={token} onLogout={onLogout} /></Protected>} />
<<<<<<< HEAD
      <Route path="/mercado" element={<Protected user={user} token={token}><Mercado user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/perfil" element={<Protected user={user} token={token}><Perfil user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes" element={<Protected user={user} token={token}><Deportes user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes/reservas" element={<Protected user={user} token={token}><ReservasDeportivas user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes/falta-jugador" element={<Protected user={user} token={token}><FaltaJugador user={user} token={token} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes/falta-jugador/crear" element={<Protected user={user} token={token}><CrearPartido user={user} onLogout={onLogout} /></Protected>} />
      <Route path="/deportes/mis-reservas" element={<Protected user={user} token={token}><MisReservas user={user} token={token} onLogout={onLogout} /></Protected>} />
=======
      <Route path="/deportes" element={<Protected user={user} token={token}><Deportes user={user} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route path="/deportes/reservas" element={<Protected user={user} token={token}><ReservasDeportivas user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route path="/deportes/falta-jugador" element={<Protected user={user} token={token}><FaltaJugador user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
      <Route
  path="/deportes/falta-jugador/crear"
  element={
    <Protected user={user} token={token}>
      <CrearPartido
        user={user}
        token={token}
        onLogout={onLogout}
        Layout={Layout}
      />
    </Protected>
  }
/>
      <Route path="/deportes/mis-reservas" element={<Protected user={user} token={token}><MisReservas user={user} token={token} onLogout={onLogout} Layout={Layout} /></Protected>} />
>>>>>>> origin/FaltaUnJugador
    </Routes>
  );
}
