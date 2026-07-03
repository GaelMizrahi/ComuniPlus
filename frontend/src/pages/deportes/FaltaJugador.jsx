import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import FaltaJugadorFilters from '../../components/deportes/FaltaJugadorFilters.jsx';
import PartidoCard from '../../components/deportes/PartidoCard.jsx';
import { getPartidosFaltaJugador, unirseAPartido } from '../../services/faltaJugadorApi.js';

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

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPartidosFaltaJugador(token, selectedSport);
      setPartidos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedSport]);

  const join = async (partidoId) => {
    try {
      setJoiningId(partidoId);
      setMsg('');
      setError('');
      await unirseAPartido(token, partidoId);
      setMsg('Te sumaste al partido correctamente.');
      await load();
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message || 'No se pudo registrar la participación');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <div className="section-head">
        <div>
          <p className="eyebrow">Deportes</p>
          <h1>¿Falta un jugador?</h1>
        </div>
      </div>

      <p className="muted">Encontrá partidos para sumarte o creá una convocatoria para completar tu equipo.</p>

      <button className="btn green full big-action" type="button" onClick={() => nav('/deportes/falta-jugador/crear')}>
        + Crear partido
      </button>

      <FaltaJugadorFilters sports={SPORTS} selectedSport={selectedSport} onSelect={setSelectedSport} />

      {msg && <p className="ok notice">{msg}</p>}
      {error && <p className="error notice">{error}</p>}

      <h3>Partidos disponibles</h3>
      {loading && <p>Cargando partidos...</p>}
      {!loading && partidos.map((partido) => (
        <PartidoCard key={partido.id} partido={partido} onJoin={join} joining={joiningId === partido.id} />
      ))}
      {!loading && !partidos.length && <p className="empty-state">No hay partidos disponibles para este filtro.</p>}
    </Layout>
  );
}
