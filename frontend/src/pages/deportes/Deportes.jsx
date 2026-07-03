import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import SportFilter from '../../components/deportes/SportFilter.jsx';
import CourtCard from '../../components/deportes/CourtCard.jsx';
import Calendar from '../../components/deportes/Calendar.jsx';
import TimeSlots from '../../components/deportes/TimeSlots.jsx';
import ReservationSummary from '../../components/deportes/ReservationSummary.jsx';

import {
  createReserva,
  getDeportes,
  getHorarios
} from '../../services/deportesApi.js';

const DEFAULT_SPORTS = [
  'Fútbol masculino',
  'Fútbol femenino',
  'Tenis',
  'Básquet',
  'Patín',
  'Pádel',
  'Hockey',
  'Gimnasia Artística',
  'Vóley'
];

function normalizeHorarios(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.horarios)) return data.horarios;

  if (Array.isArray(data?.slots)) return data.slots;

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

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
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadCourts() {
      try {
        setLoadingCourts(true);
        setError('');
        setMsg('');

        const data = await getDeportes(token, selectedSport);

        if (!alive) return;

        setSports(Array.isArray(data?.sports) ? data.sports : DEFAULT_SPORTS);
        setCourts(Array.isArray(data?.courts) ? data.courts : []);
        setSelectedCourt(null);
        setDate('');
        setSlots([]);
        setSelectedTime('');
      } catch (err) {
        if (!alive) return;

        if (err.status === 401) {
          onLogout();
          return;
        }

        setError(err.message || 'Error al cargar deportes');
      } finally {
        if (alive) setLoadingCourts(false);
      }
    }

    loadCourts();

    return () => {
      alive = false;
    };
  }, [token, selectedSport, onLogout]);

  useEffect(() => {
    let alive = true;

    async function loadSlots() {
      if (!selectedCourt || !date) {
        setSlots([]);
        setSelectedTime('');
        return;
      }

      try {
        setLoadingSlots(true);
        setError('');
        setSelectedTime('');

        const data = await getHorarios(token, selectedCourt.id, date);

        if (!alive) return;

        const horarios = normalizeHorarios(data);

        console.log('Horarios recibidos:', data);
        console.log('Horarios normalizados:', horarios);

        setSlots(horarios);
      } catch (err) {
        if (!alive) return;

        if (err.status === 401) {
          onLogout();
          return;
        }

        setSlots([]);
        setError(err.message || 'Error al cargar horarios');
      } finally {
        if (alive) setLoadingSlots(false);
      }
    }

    loadSlots();

    return () => {
      alive = false;
    };
  }, [token, selectedCourt, date, onLogout]);

  const handleSelectCourt = (court) => {
    setSelectedCourt(court);
    setDate('');
    setSlots([]);
    setSelectedTime('');
    setMsg('');
    setError('');
  };

  const handleSelectDate = (newDate) => {
    setDate(newDate);
    setSlots([]);
    setSelectedTime('');
    setMsg('');
    setError('');
  };

  const confirm = async () => {
    setMsg('');
    setError('');

    if (!selectedSport || !selectedCourt || !date || !selectedTime) {
      setError('Seleccioná deporte, cancha, fecha y horario.');
      return;
    }

    try {
      await createReserva(token, {
        courtId: selectedCourt.id,
        date,
        time: selectedTime,
        sport: selectedCourt.sport || selectedSport,
        cantidadJugadores:
          selectedCourt.capacity ||
          selectedCourt.cantidadMax ||
          1
      });

      setMsg('Reserva confirmada correctamente.');

      const horariosActualizados = await getHorarios(
        token,
        selectedCourt.id,
        date
      );

      const horarios = normalizeHorarios(horariosActualizados);

      setSlots(horarios);
      setSelectedTime('');
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }

      setError(err.message || 'Error al confirmar reserva');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <div className="section-head">
        <div>
          <p className="eyebrow">Deportes</p>
          <h1>Reservas deportivas</h1>
        </div>

        <Link to="/deportes/mis-reservas" className="mini-link">
          Mis reservas
        </Link>
      </div>

      <SportFilter
        sports={sports}
        selectedSport={selectedSport}
        onSelect={setSelectedSport}
      />

      {msg && <p className="ok notice">{msg}</p>}
      {error && <p className="error notice">{error}</p>}

      <h3>Selecciona pista</h3>

      {loadingCourts ? (
        <p>Cargando canchas...</p>
      ) : (
        <>
          <div className="court-list">
            {courts.map((court) => (
              <CourtCard
                key={court.id}
                court={court}
                selected={selectedCourt?.id === court.id}
                onSelect={handleSelectCourt}
              />
            ))}
          </div>

          {!courts.length && (
            <p className="empty-state">
              No hay canchas disponibles para este deporte.
            </p>
          )}
        </>
      )}

      {selectedCourt && (
        <Calendar
          value={date}
          onChange={handleSelectDate}
        />
      )}

      {selectedCourt && !date && (
        <p className="empty-state">
          Seleccioná una fecha para ver los horarios disponibles.
        </p>
      )}

      {selectedCourt && date && (
        <>
          {loadingSlots ? (
            <p>Cargando horarios...</p>
          ) : (
            <TimeSlots
              slots={slots}
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
            />
          )}
        </>
      )}

      <ReservationSummary
        court={selectedCourt}
        date={date}
        time={selectedTime}
      />

      <button
        className="btn green full"
        type="button"
        onClick={confirm}
      >
        Confirmar reserva
      </button>

      <p className="muted small">
        El importe de la reserva será agregado a la cuota mensual del socio.
      </p>

      <p className="muted small">
        Las reservas pueden cancelarse sin costo hasta 36 horas antes del horario reservado.
      </p>
    </Layout>
  );
}