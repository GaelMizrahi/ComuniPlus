import { Link } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import SportFilter from '../../components/deportes/SportFilter.jsx';
import CourtCard from '../../components/deportes/CourtCard.jsx';
import Calendar from '../../components/deportes/Calendar.jsx';
import TimeSlots from '../../components/deportes/TimeSlots.jsx';
import ReservationSummary from '../../components/deportes/ReservationSummary.jsx';
import { createReserva, getDeportes, getHorarios } from '../../services/deportesApi.js';

const DEFAULT_SPORTS = ['Fútbol masculino', 'Fútbol femenino', 'Tenis', 'Básquet', 'Patín', 'Pádel', 'Hockey', 'Gimnasia Artística', 'Vóley'];

export default function Deportes({ user, token, onLogout, Layout }) {
  const [sports, setSports] = useState(DEFAULT_SPORTS);
  const [selectedSport, setSelectedSport] = useState(DEFAULT_SPORTS[0]);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getDeportes(token, selectedSport)
      .then((data) => {
        setSports(Array.isArray(data.sports) ? data.sports : DEFAULT_SPORTS);
        setCourts(Array.isArray(data.courts) ? data.courts : []);
        setSelectedCourt(null);
        setDate('');
        setSlots([]);
        setSelectedTime('');
      })
      .catch((err) => err.status === 401 ? onLogout() : setError(err.message));
  }, [selectedSport]);

  useEffect(() => {
    if (!selectedCourt || !date) return setSlots([]);
    getHorarios(token, selectedCourt.id, date)
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setSelectedTime('');
      })
      .catch((err) => err.status === 401 ? onLogout() : setError(err.message));
  }, [selectedCourt, date]);

  const confirm = async () => {
    setMsg('');
    setError('');
    if (!selectedCourt || !date || !selectedTime) return setError('Seleccioná deporte, cancha, fecha y horario.');

    try {
      const data = await createReserva(token, { courtId: selectedCourt.id, date, time: selectedTime });
      setMsg('Reserva confirmada correctamente.');
      setSlots(Array.isArray(data.horarios) ? data.horarios : []);
      setSelectedCourt(null);
      setDate('');
      setSelectedTime('');
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <div className="section-head">
        <div><p className="eyebrow">Deportes</p><h1>Reservas deportivas</h1></div>
        <Link to="/deportes/mis-reservas" className="mini-link">Mis reservas</Link>
      </div>
      <SportFilter sports={sports} selectedSport={selectedSport} onSelect={setSelectedSport} />
      {msg && <p className="ok notice">{msg}</p>}
      {error && <p className="error notice">{error}</p>}

      <h3>Selecciona pista</h3>
      <div className="court-list">
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} selected={selectedCourt?.id === court.id} onSelect={setSelectedCourt} />
        ))}
      </div>
      {!courts.length && <p className="empty-state">No hay canchas disponibles para este deporte.</p>}

      {selectedCourt && <Calendar value={date} onChange={setDate} />}
      {selectedCourt && date && <TimeSlots slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />}
      <ReservationSummary court={selectedCourt} date={date} time={selectedTime} />
      <button className="btn green full" type="button" onClick={confirm}>Confirmar reserva</button>
      <p className="muted small">El importe de la reserva será agregado a la cuota mensual del socio.</p>
      <p className="muted small">Las reservas pueden cancelarse sin costo hasta 36 horas antes del horario reservado.</p>
    </Layout>
  );
}
