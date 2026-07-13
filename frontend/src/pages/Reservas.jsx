import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';
import DatePill from '../components/ui/DatePill.jsx';
import RouteBox from '../components/ui/RouteBox.jsx';
import Toast from '../components/ui/Toast.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
const authHeaders = (t) => ({ Authorization: `Bearer ${t}` });

export default function Reservas({ user, token, onLogout }) {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reservations`, { headers: authHeaders(token) });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    const res = await fetch(`${API_URL}/api/reservations/${id}/cancel`, { method: 'POST', headers: authHeaders(token) });
    if (res.status === 401) return onLogout();
    setToast({ message: 'Reserva cancelada', type: 'success' });
    load();
  };

  const complete = async (id) => {
    const res = await fetch(`${API_URL}/api/reservations/${id}/complete`, { method: 'POST', headers: authHeaders(token) });
    if (res.status === 401) return onLogout();
    setToast({ message: 'Viaje completado', type: 'success' });
    load();
  };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-medium text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <SectionHeader eyebrow="Transporte" title="Mis reservas" />

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <ElevatedCard key={`${item.id}-${item.role}`} className="p-4 animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-accent mb-0.5">{item.roleLabel}</p>
                <p className="text-[14px] font-semibold">{item.otherPersonName}</p>
              </div>
              <DatePill date={item.departureDate} time={item.departureTime} />
            </div>

            <RouteBox origin={item.origin} destination={item.destination} />

            <div className="flex items-center gap-2 text-[13px] text-text-secondary mb-3">
              <span>Lugares: <strong className="text-text font-semibold">{item.seatsReserved}</strong></span>
            </div>

            {item.whatsappLink && (
              <a href={item.whatsappLink} target="_blank" rel="noreferrer"
                className="block text-center py-2.5 bg-[#25d366] text-white text-[13px] font-medium rounded-lg mb-3 active:scale-[0.99] transition-transform">
                WhatsApp
              </a>
            )}

            <div className="flex gap-2 pt-3 border-t border-border-subtle">
              <button onClick={() => cancel(item.id)} className="flex-1 py-2 border border-border text-[13px] font-medium text-text-secondary rounded-lg active:scale-[0.99] transition-all hover:border-danger hover:text-danger">
                Cancelar
              </button>
              {item.canComplete && (
                <button onClick={() => complete(item.id)} className="flex-1 py-2 bg-success text-white text-[13px] font-medium rounded-lg active:scale-[0.99] transition-all">
                  Completar
                </button>
              )}
            </div>
          </ElevatedCard>
        ))}

        {items.length === 0 && <EmptyState icon="📋" message="No tenés reservas activas" />}
      </div>
    </Layout>
  );
}
