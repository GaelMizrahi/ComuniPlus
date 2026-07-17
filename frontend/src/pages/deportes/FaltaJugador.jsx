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

      <button onClick={() => nav('/deportes/falta-jugador/crear')}
        className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 mb-6">
        + Crear partido
      </button>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
        {SPORTS.map((s) => (
          <Chip key={s} active={selectedSport === s} onClick={() => setSelectedSport(s)}>{s}</Chip>
        ))}
      </div>

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
  );
}
