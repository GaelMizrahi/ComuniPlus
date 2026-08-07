import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Chip from '../../components/ui/Chip.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import DatePill from '../../components/ui/DatePill.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { getPartidosFaltaJugador, unirseAPartido } from '../../services/faltaJugadorApi.js';
=======

import FaltaJugadorFilters from '../../components/deportes/FaltaJugadorFilters.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
>>>>>>> origin/FaltaUnJugador

const SPORTS = ['Todos', 'Fútbol femenino', 'Fútbol masculino', 'Pádel', 'Tenis', 'Running', 'Básquet', 'Patín', 'Hockey', 'Gimnasia Artística', 'Vóley'];

export default function FaltaJugador({ user, token, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  const nav = useNavigate();

  const [selectedSport, setSelectedSport] = useState('Todos');
  const [partidos, setPartidos] = useState([]);
  const [toast, setToast] = useState(null);
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
<<<<<<< HEAD
      setLoading(true); setError('');
      const data = await getPartidosFaltaJugador(token, selectedSport);
      setPartidos(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message || 'Error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedSport]);

  const join = async (id) => {
    try {
      setJoiningId(id); setToast(null); setError('');
      await unirseAPartido(token, id);
      setToast({ message: 'Te sumaste al partido', type: 'success' });
      await load();
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message || 'Error');
    } finally { setJoiningId(null); }
  };
=======
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
>>>>>>> origin/FaltaUnJugador

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

<<<<<<< HEAD
      <SectionHeader eyebrow="Deportes" title="¿Falta un jugador?" />

      <button onClick={() => nav('/deportes/falta-jugador/crear')}
        className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 mb-6">
        + Crear partido
      </button>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
        {SPORTS.map((s) => (
          <Chip key={s} active={selectedSport === s} onClick={() => setSelectedSport(s)}>{s}</Chip>
        ))}
      </div>
=======
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
>>>>>>> origin/FaltaUnJugador

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-danger-light rounded-xl animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[13px] font-semibold text-danger">{error}</p>
        </div>
      )}

<<<<<<< HEAD
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[18px] skeleton" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {partidos.map((p, i) => (
            <ElevatedCard key={p.id} className="p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">{p.deporte}</p>
                  <p className="text-[14px] font-bold mt-0.5">{p.nivel}</p>
                </div>
                <DatePill date={p.fecha} time={p.horario} />
              </div>
              <div className="flex items-center gap-4 text-[13px] text-text-secondary mb-4 font-medium">
                <span>Faltan: <strong className="text-text font-bold">{p.jugadoresFaltantes}</strong></span>
                <span className="text-border">·</span>
                <span>{p.estado}</span>
              </div>
              <button onClick={() => join(p.id)} disabled={joiningId === p.id}
                className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 disabled:opacity-40">
                {joiningId === p.id ? 'Uniendo...' : 'Unirme'}
              </button>
            </ElevatedCard>
          ))}
          {partidos.length === 0 && !error && <EmptyState icon="⚽" message="No hay partidos disponibles" />}
        </div>
      )}
    </L>
=======
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
>>>>>>> origin/FaltaUnJugador
  );
}