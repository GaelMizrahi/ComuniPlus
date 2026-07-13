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
const jsonHeaders = (t) => ({ 'Content-Type': 'application/json', ...authHeaders(t) });

export default function Viajes({ user, token, onLogout }) {
  const nav = useNavigate();
  const [rides, setRides] = useState([]);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rides`, { headers: authHeaders(token) });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      setRides(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const confirmOffer = async (rideId) => {
    const res = await fetch(`${API_URL}/api/rides/${rideId}/offer`, { method: 'POST', headers: jsonHeaders(token) });
    if (res.status === 401) return onLogout();
    const data = await res.json();
    if (!res.ok) return setToast({ message: data.message || 'Error', type: 'error' });
    setToast({ message: 'Viaje aceptado', type: 'success' });
    load();
  };

  const cancelOwn = async (rideId) => {
    const res = await fetch(`${API_URL}/api/rides/${rideId}/cancel`, { method: 'POST', headers: jsonHeaders(token) });
    if (res.status === 401) return onLogout();
    setToast({ message: 'Solicitud cancelada', type: 'success' });
    load();
  };

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <SectionHeader eyebrow="Transporte" title="Carpooling" />

      <div className="flex flex-col gap-3">
        {rides.map((ride) => {
          const isMine = Number(ride.requesterId) === Number(user.id);
          return (
            <ElevatedCard key={ride.id} className="p-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-[12px] font-medium text-text-muted">{ride.requesterName}</p>
                </div>
                <DatePill date={ride.departureDate} time={ride.departureTime} />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold text-success">{ride.seatsAvailable} lugar{ride.seatsAvailable === 1 ? '' : 'es'}</span>
              </div>

              <RouteBox origin={ride.origin} destination={ride.destination} />

              {isMine ? (
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border-subtle">
                  <span className="text-[12px] text-text-muted">Tu solicitud</span>
                  <button
                    onClick={() => cancelOwn(ride.id)}
                    className="text-[13px] font-medium text-danger active:opacity-60 transition-opacity"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-1 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => confirmOffer(ride.id)}
                    className="w-full py-2.5 bg-text text-white text-[13px] font-medium rounded-lg active:scale-[0.99] transition-all hover:bg-text/90"
                  >
                    Ofrecer lugar
                  </button>
                </div>
              )}
            </ElevatedCard>
          );
        })}

        {rides.length === 0 && (
          <EmptyState icon="🚗" message="No hay solicitudes activas" action="Pedir viaje" onAction={() => nav('/viajes/solicitar')} />
        )}
      </div>

      {rides.length > 0 && (
        <button
          onClick={() => nav('/viajes/solicitar')}
          className="fixed bottom-20 right-5 z-40 w-12 h-12 bg-text text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform text-xl"
        >
          +
        </button>
      )}
    </Layout>
  );
}
