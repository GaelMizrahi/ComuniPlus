import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import FaltaJugadorFilters from '../../components/deportes/FaltaJugadorFilters.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const SPORTS = [
  'Todos',
  'Fútbol femenino',
  'Fútbol masculino',
  'Pádel',
  'Tenis',
  'Running',
  'Básquet',
  'Patín',
  'Hockey',
  'Gimnasia Artística',
  'Vóley'
];

export default function FaltaJugador({ user, token, onLogout, Layout }) {
  const nav = useNavigate();

  const [selectedSport, setSelectedSport] = useState('Todos');
  const [partidos, setPartidos] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  function getToken() {
    return token || localStorage.getItem('comuni_token') || '';
  }

  async function parseResponse(response) {
    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || 'El backend no devolvió JSON');
    }

    if (!response.ok) {
      const err = new Error(data.message || 'Error de servidor');
      err.status = response.status;
      throw err;
    }

    return data;
  }

  async function load() {
    try {
      setLoading(true);
      setError('');

      const authToken = getToken();

      if (!authToken) {
        throw new Error('No hay token. Volvé a iniciar sesión.');
      }

      const query =
        selectedSport && selectedSport !== 'Todos'
          ? `?deporte=${encodeURIComponent(selectedSport)}`
          : '';

      const response = await fetch(`${API_URL}/api/partidos${query}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      const data = await parseResponse(response);

      console.log('PARTIDOS RECIBIDOS:', data);

      setPartidos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }

      setError(err.message || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  }

  async function join(partidoId) {
    try {
      setJoiningId(partidoId);
      setMsg('');
      setError('');

      const authToken = getToken();

      if (!authToken) {
        throw new Error('No hay token. Volvé a iniciar sesión.');
      }

      const response = await fetch(`${API_URL}/api/partidos/${partidoId}/unirse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      await parseResponse(response);

      setMsg('Te sumaste al partido correctamente.');
      await load();
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }

      setError(err.message || 'No se pudo registrar la participación');
    } finally {
      setJoiningId(null);
    }
  }

  useEffect(() => {
    load();
  }, [selectedSport]);

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <div className="section-head">
        <div>
          <p className="eyebrow">Deportes</p>
          <h1>¿Falta un jugador?</h1>
        </div>
      </div>

      <p className="muted">
        Encontrá partidos para sumarte o creá una convocatoria para completar tu equipo.
      </p>

      <button
        className="btn green full big-action"
        type="button"
        onClick={() => nav('/deportes/falta-jugador/crear')}
      >
        + Crear partido
      </button>

      <FaltaJugadorFilters
        sports={SPORTS}
        selectedSport={selectedSport}
        onSelect={setSelectedSport}
      />

      {msg && <p className="ok notice">{msg}</p>}
      {error && <p className="error notice">{error}</p>}

      <h3>Partidos disponibles</h3>

      {loading && <p>Cargando partidos...</p>}

      {!loading && partidos.length === 0 && (
        <p className="empty-state">
          No hay partidos disponibles para este filtro.
        </p>
      )}

      {!loading &&
        partidos.map((partido) => (
          <article key={partido.id} className="card">
            <p className="eyebrow">{partido.deporte}</p>

            <h3>{partido.titulo}</h3>

            {partido.descripcion && (
              <p className="muted">{partido.descripcion}</p>
            )}

            <p>
              <strong>Fecha:</strong> {partido.dia}
            </p>

            <p>
              <strong>Horario:</strong>{' '}
              {String(partido.horario ?? '').slice(0, 5)}
            </p>

            <p>
              <strong>Lugar:</strong> {partido.lugar}
            </p>

            <p>
              <strong>Cupos:</strong>{' '}
              {partido.inscritos ?? 0}/{partido.jugadoresNecesarios ?? 1}
            </p>

            {partido.esCreador ? (
              <button className="btn light full" disabled>
                Es tu partido
              </button>
            ) : partido.yaUnido ? (
              <button className="btn light full" disabled>
                Ya estás unido
              </button>
            ) : partido.lleno ? (
              <button className="btn light full" disabled>
                Partido completo
              </button>
            ) : (
              <button
                className="btn full"
                type="button"
                onClick={() => join(partido.id)}
                disabled={joiningId === partido.id}
              >
                {joiningId === partido.id ? 'Uniéndote...' : 'Unirme'}
              </button>
            )}
          </article>
        ))}
    </Layout>
  );
}