import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import Chip from '../../components/ui/Chip.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import DatePill from '../../components/ui/DatePill.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { getPartidosFaltaJugador, unirseAPartido } from '../../services/faltaJugadorApi.js';

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

  const load = async () => {
    try {
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

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <SectionHeader eyebrow="Deportes" title="¿Falta un jugador?" />

      <button onClick={() => nav('/deportes/falta-jugador/crear')} className="w-full py-2.5 bg-text text-white text-[13px] font-medium rounded-lg active:scale-[0.99] transition-all mb-5 hover:bg-text/90">
        + Crear partido
      </button>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5">
        {SPORTS.map((s) => (
          <Chip key={s} active={selectedSport === s} onClick={() => setSelectedSport(s)}>{s}</Chip>
        ))}
      </div>

      {error && <p className="text-[13px] text-danger mb-3 animate-fade-in">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-surface-secondary animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {partidos.map((p) => (
            <ElevatedCard key={p.id} className="p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">{p.deporte}</p>
                  <p className="text-[14px] font-semibold mt-0.5">{p.nivel}</p>
                </div>
                <DatePill date={p.fecha} time={p.horario} />
              </div>
              <div className="flex items-center gap-4 text-[13px] text-text-secondary mb-3">
                <span>Faltan: <strong className="text-text">{p.jugadoresFaltantes}</strong></span>
                <span className="text-border">·</span>
                <span>{p.estado}</span>
              </div>
              <button onClick={() => join(p.id)} disabled={joiningId === p.id}
                className="w-full py-2.5 bg-accent text-white text-[13px] font-medium rounded-lg active:scale-[0.99] transition-all disabled:opacity-40 hover:bg-accent-hover">
                {joiningId === p.id ? 'Uniendo...' : 'Unirme'}
              </button>
            </ElevatedCard>
          ))}
          {partidos.length === 0 && !error && <EmptyState icon="⚽" message="No hay partidos disponibles" />}
        </div>
      )}
    </L>
  );
}
