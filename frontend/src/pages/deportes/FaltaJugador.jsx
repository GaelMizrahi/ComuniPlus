import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Chip from '../../components/ui/Chip.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import DatePill from '../../components/ui/DatePill.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

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
  'Vóley',
];

export default function FaltaJugador({
  user,
  token,
  onLogout,
  Layout: LayoutProp,
}) {
  const L = LayoutProp || Layout;
  const nav = useNavigate();

  const [selectedSport, setSelectedSport] = useState('Todos');
  const [partidos, setPartidos] = useState([]);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  function getToken() {
    return (
      token ||
      localStorage.getItem('comuni_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('accessToken')
    );
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

      const response = await fetch(
        `${API_URL}/api/partidos${query}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

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
      setToast(null);
      setError('');

      const authToken = getToken();

      if (!authToken) {
        throw new Error('No hay token. Volvé a iniciar sesión.');
      }

      const response = await fetch(
        `${API_URL}/api/partidos/${partidoId}/unirse`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      await parseResponse(response);

      setToast({
        message: 'Te sumaste al partido correctamente.',
        type: 'success',
      });

      await load();
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }

      setError(
        err.message || 'No se pudo registrar la participación'
      );
    } finally {
      setJoiningId(null);
    }
  }

  useEffect(() => {
    load();
  }, [selectedSport]);

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && (
        <Toast
          {...toast}
          onClose={() => setToast(null)}
        />
      )}

      <SectionHeader
        eyebrow="Deportes"
        title="¿Falta un jugador?"
      />

      <button
        onClick={() => nav('/deportes/falta-jugador/crear')}
        className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 mb-6"
      >
        + Crear partido
      </button>

      <p className="text-[13px] text-text-secondary mb-5">
        Encontrá partidos para sumarte o creá una convocatoria
        para completar tu equipo.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
        {SPORTS.map((sport) => (
          <Chip
            key={sport}
            active={selectedSport === sport}
            onClick={() => setSelectedSport(sport)}
          >
            {sport}
          </Chip>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-danger-light rounded-xl animate-fade-in">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-danger shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>

          <p className="text-[13px] font-semibold text-danger">
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-[18px] skeleton"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {partidos.map((partido, i) => (
            <ElevatedCard
              key={partido.id}
              className="p-4 animate-slide-up"
              style={{
                animationDelay: `${i * 50}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
                    {partido.deporte}
                  </p>

                  <p className="text-[14px] font-bold mt-0.5">
                    {partido.titulo || partido.nivel}
                  </p>
                </div>

                <DatePill
                  date={partido.dia || partido.fecha}
                  time={partido.horario}
                />
              </div>

              {partido.descripcion && (
                <p className="text-[13px] text-text-secondary mb-3">
                  {partido.descripcion}
                </p>
              )}

              <div className="flex flex-col gap-2 text-[13px] text-text-secondary mb-4 font-medium">
                <span>
                  Lugar:{' '}
                  <strong className="text-text font-bold">
                    {partido.lugar}
                  </strong>
                </span>

                <span>
                  Cupos:{' '}
                  <strong className="text-text font-bold">
                    {partido.inscritos ?? 0}/
                    {partido.jugadoresNecesarios ?? 1}
                  </strong>
                </span>

                {partido.estado && (
                  <span>
                    Estado:{' '}
                    <strong className="text-text font-bold">
                      {partido.estado}
                    </strong>
                  </span>
                )}
              </div>

              {partido.esCreador ? (
                <button
                  className="w-full py-3 bg-surface text-text-muted text-[13px] font-bold rounded-xl border border-border"
                  disabled
                >
                  Es tu partido
                </button>
              ) : partido.yaUnido ? (
                <button
                  className="w-full py-3 bg-surface text-text-muted text-[13px] font-bold rounded-xl border border-border"
                  disabled
                >
                  Ya estás unido
                </button>
              ) : partido.lleno ? (
                <button
                  className="w-full py-3 bg-surface text-text-muted text-[13px] font-bold rounded-xl border border-border"
                  disabled
                >
                  Partido completo
                </button>
              ) : (
                <button
                  onClick={() => join(partido.id)}
                  disabled={joiningId === partido.id}
                  className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
                >
                  {joiningId === partido.id
                    ? 'Uniéndote...'
                    : 'Unirme'}
                </button>
              )}
            </ElevatedCard>
          ))}

          {partidos.length === 0 && !error && (
            <EmptyState
              icon="⚽"
              message="No hay partidos disponibles"
            />
          )}
        </div>
      )}
    </L>
  );
}