import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import SectionHeader from '../../components/ui/SectionHeader.jsx';
import ElevatedCard from '../../components/ui/ElevatedCard.jsx';
import Chip from '../../components/ui/Chip.jsx';
import Toast from '../../components/ui/Toast.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SportFilter from '../../components/deportes/SportFilter.jsx';
import Calendar from '../../components/deportes/Calendar.jsx';
import TimeSlots from '../../components/deportes/TimeSlots.jsx';
import ReservationSummary from '../../components/deportes/ReservationSummary.jsx';
import { createReserva, getDeportes, getHorarios } from '../../services/deportesApi.js';

const DEFAULT_SPORTS = ['Fútbol masculino', 'Fútbol femenino', 'Tenis', 'Básquet', 'Patín', 'Pádel', 'Hockey', 'Gimnasia Artística', 'Vóley'];

function normalizeHorarios(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.horarios)) return data.horarios;
  if (Array.isArray(data?.slots)) return data.slots;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function ReservasDeportivas({ user, token, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  const [sports, setSports] = useState(DEFAULT_SPORTS);
  const [selectedSport, setSelectedSport] = useState(DEFAULT_SPORTS[0]);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoadingCourts(true); setError('');
        const data = await getDeportes(token, selectedSport);
        if (!alive) return;
        setSports(Array.isArray(data?.sports) ? data.sports : DEFAULT_SPORTS);
        setCourts(Array.isArray(data?.courts) ? data.courts : []);
        setSelectedCourt(null); setDate(''); setSlots([]); setSelectedTime('');
      } catch (err) {
        if (!alive) return;
        if (err.status === 401) return onLogout();
        setError(err.message || 'Error');
      } finally { if (alive) setLoadingCourts(false); }
    }
    load();
    return () => { alive = false; };
  }, [token, selectedSport, onLogout]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedCourt || !date) { setSlots([]); setSelectedTime(''); return; }
      try {
        setLoadingSlots(true); setError(''); setSelectedTime('');
        const data = await getHorarios(token, selectedCourt.id, date);
        if (!alive) return;
        setSlots(normalizeHorarios(data));
      } catch (err) {
        if (!alive) return;
        if (err.status === 401) return onLogout();
        setSlots([]); setError(err.message || 'Error');
      } finally { if (alive) setLoadingSlots(false); }
    }
    load();
    return () => { alive = false; };
  }, [token, selectedCourt, date, onLogout]);

  const handleSelectCourt = (court) => { setSelectedCourt(court); setDate(''); setSlots([]); setSelectedTime(''); };

  const confirm = async () => {
    setError('');
    if (!selectedCourt || !date || !selectedTime) return setError('Selecciona cancha, fecha y horario.');
    try {
      await createReserva(token, {
        courtId: selectedCourt.id, date, time: selectedTime,
        sport: selectedCourt.sport || selectedSport,
        cantidadJugadores: selectedCourt.capacity || selectedCourt.cantidadMax || 1,
      });
      setToast({ message: 'Reserva confirmada', type: 'success' });
      const updated = await getHorarios(token, selectedCourt.id, date);
      setSlots(normalizeHorarios(updated)); setSelectedTime('');
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message || 'Error');
    }
  };

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <SectionHeader eyebrow="Deportes" title="Reservar cancha" link="/deportes/mis-reservas" linkText="Mis reservas" />

      <SportFilter sports={sports} selectedSport={selectedSport} onSelect={setSelectedSport} />

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

      <h3 className="text-[14px] font-bold text-text-secondary mb-3">Canchas</h3>
      {loadingCourts ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-36 rounded-[18px] skeleton" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {courts.map((court) => (
            <ElevatedCard key={court.id} onClick={() => handleSelectCourt(court)}
              className={`overflow-hidden transition-all duration-300 ${
                selectedCourt?.id === court.id
                  ? 'ring-2 ring-accent shadow-glow'
                  : 'hover:shadow-butter-lg'
              }`}>
              <img src={court.image || 'https://placehold.co/640x360/f1f3f8/8e99ab?text=Cancha'} alt={court.name} className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold">{court.name}</h4>
                    <p className="text-[12px] text-text-muted mt-0.5 font-medium">{court.location}</p>
                  </div>
                  <p className="text-[15px] font-extrabold text-text">${court.pricePerHour}<span className="text-[12px] font-medium text-text-muted">/h</span></p>
                </div>
              </div>
            </ElevatedCard>
          ))}
          {courts.length === 0 && <EmptyState icon="🏟️" message="No hay canchas disponibles" />}
        </div>
      )}

      {selectedCourt && <Calendar value={date} onChange={(d) => { setDate(d); setSlots([]); setSelectedTime(''); }} />}

      {selectedCourt && date && (
        loadingSlots ? (
          <div className="grid grid-cols-3 gap-2 my-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-11 rounded-xl skeleton" />)}
          </div>
        ) : <TimeSlots slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
      )}

      <ReservationSummary court={selectedCourt} date={date} time={selectedTime} />

      <button onClick={confirm}
        className="w-full py-3.5 mt-4 bg-accent text-white text-[15px] font-bold rounded-xl shadow-fab transition-all duration-200 active:scale-[0.98] disabled:opacity-40">
        Confirmar reserva
      </button>
      <p className="text-[12px] text-text-muted text-center mt-3 font-medium">El importe se agrega a la cuota mensual</p>
    </L>
  );
}
