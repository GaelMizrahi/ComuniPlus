import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import DatePill from '../../components/ui/DatePill.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
const authHeaders = (t) => ({ Authorization: `Bearer ${t}` });

export default function MisReservas({ user, token, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  const nav = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/reservas/mias`, { headers: authHeaders(token) });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      setReservas(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/reservas/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      setToast({ message: data.message || 'Cancelada', type: res.ok ? 'success' : 'error' });
      load();
    } catch { setToast({ message: 'Error', type: 'error' }); }
  };

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-medium text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <SectionHeader eyebrow="Deportes" title="Mis reservas" />

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-surface-secondary animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reservas.map((r) => (
            <ElevatedCard key={r.id} className="p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">{r.sport || r.deporte}</p>
                  <p className="text-[14px] font-semibold mt-0.5">{r.courtName || r.cancha || 'Cancha'}</p>
                </div>
                <DatePill date={r.date || r.fecha} time={r.time || r.horario} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <span className="text-[12px] font-medium text-text-muted">{r.status || r.estado}</span>
                <button onClick={() => cancel(r.id)} className="text-[13px] font-medium text-danger active:opacity-60 transition-opacity">Cancelar</button>
              </div>
            </ElevatedCard>
          ))}
          {reservas.length === 0 && <EmptyState icon="🏟" message="No tenés reservas deportivas" />}
        </div>
      )}
    </L>
  );
}
