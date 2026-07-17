import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';
import DatePill from '../components/ui/DatePill.jsx';
import RouteBox from '../components/ui/RouteBox.jsx';
import Toast from '../components/ui/Toast.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const authHeaders = (t) => ({ Authorization: `Bearer ${t}` });
const jsonHeaders = (t) => ({ 'Content-Type': 'application/json', ...authHeaders(t) });

const AVATAR_IDS = [14, 22, 36, 44, 51, 63];

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
        {rides.map((ride, i) => {
          const isMine = Number(ride.requesterId) === Number(user.id);
          const avatarId = AVATAR_IDS[i % AVATAR_IDS.length];
          return (
            <ElevatedCard key={ride.id} className="p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={`https://i.pravatar.cc/80?u=user${ride.requesterId || avatarId}`}
                  alt={ride.requesterName}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-text truncate">{ride.requesterName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#e8930c" stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-[11px] font-semibold text-text-muted">4.{8 + (i % 3)}</span>
                  </div>
                </div>
                <DatePill date={ride.departureDate} time={ride.departureTime} />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold text-success">{ride.seatsAvailable} lugar{ride.seatsAvailable === 1 ? '' : 'es'}</span>
              </div>

              <RouteBox origin={ride.origin} destination={ride.destination} />

              {isMine ? (
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-border-subtle">
                  <span className="text-[12px] font-medium text-text-muted">Tu solicitud</span>
                  <button
                    onClick={() => cancelOwn(ride.id)}
                    className="text-[13px] font-semibold text-danger active:opacity-60 transition-opacity px-3 py-1 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-1 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => confirmOffer(ride.id)}
                    className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200"
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
          className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-fab active:scale-95 transition-all duration-200 text-2xl font-light"
        >
          +
        </button>
      )}
    </Layout>
  );
}
