import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:4000';

export default function CrearPartido({ user, token, onLogout, Layout }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    deporte: 'Tenis',
    titulo: '',
    descripcion: '',
    dia: '',
    horario: '',
    lugar: '',
    jugadoresNecesarios: 1
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function getToken() {
  return (
    token ||
    localStorage.getItem('comuni_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken')
  );
}

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
  e.preventDefault();

  try {
    setLoading(true);
    setError('');
    setSuccess('');

    const token = getToken();

    console.log('TOKEN QUE SE ENVÍA:', token);

    if (!token) {
      throw new Error('No hay token. Cerrá sesión e iniciá sesión de nuevo.');
    }

    const response = await fetch(`${API_URL}/api/partidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        deporte: form.deporte,
        titulo: form.titulo,
        descripcion: form.descripcion,
        dia: form.dia,
        horario: form.horario,
        lugar: form.lugar,
        jugadoresNecesarios: Number(form.jugadoresNecesarios)
      })
    });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear partido');
      }

      setSuccess('Partido creado correctamente');

      setTimeout(() => {
        navigate('/deportes/falta-jugador');
      }, 800);
    } catch (err) {
      setError(err.message || 'Error al crear partido');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <p className="eyebrow">¿Falta un jugador?</p>
      <h1>Crear partido</h1>

      <p className="muted">
        Completá los datos del partido para que otros usuarios puedan sumarse.
      </p>

      <form className="card form-card" onSubmit={handleSubmit}>
        <label>
          Deporte
          <select
            name="deporte"
            value={form.deporte}
            onChange={handleChange}
            required
          >
            <option value="Tenis">Tenis</option>
            <option value="Fútbol masculino">Fútbol masculino</option>
            <option value="Fútbol femenino">Fútbol femenino</option>
            <option value="Básquet">Básquet</option>
            <option value="Pádel">Pádel</option>
            <option value="Hockey">Hockey</option>
            <option value="Vóley">Vóley</option>
            <option value="Patín">Patín</option>
            <option value="Gimnasia Artística">Gimnasia Artística</option>
          </select>
        </label>

        <label>
          Título
          <input
            type="text"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            placeholder="Ej: Falta uno para tenis"
            required
          />
        </label>

        <label>
          Descripción
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej: Necesitamos un jugador más para completar el partido."
            rows="4"
          />
        </label>

        <label>
          Fecha
          <input
            type="date"
            name="dia"
            value={form.dia}
            min={today}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Horario
          <input
            type="time"
            name="horario"
            value={form.horario}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Lugar
          <input
            type="text"
            name="lugar"
            value={form.lugar}
            onChange={handleChange}
            placeholder="Ej: Canchas Kineret"
            required
          />
        </label>

        <label>
          Jugadores necesarios
          <input
            type="number"
            name="jugadoresNecesarios"
            value={form.jugadoresNecesarios}
            min="1"
            max="20"
            onChange={handleChange}
            required
          />
        </label>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <button className="btn full" type="submit" disabled={loading}>
          {loading ? 'Creando partido...' : 'Crear partido'}
        </button>

        <Link
          to="/deportes/falta-jugador"
          className="btn light full back-link"
        >
          Volver a partidos disponibles
        </Link>
      </form>
    </Layout>
  );
}