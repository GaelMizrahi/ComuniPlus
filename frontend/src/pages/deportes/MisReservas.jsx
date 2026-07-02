import { useEffect, useState } from 'react';
import { cancelReserva, getMisReservas } from '../../services/deportesApi.js';

const canCancel = (reservation) => {
  const startsAt = new Date(`${reservation.date}T${String(reservation.time).slice(0, 5)}:00`);
  return Number.isFinite(startsAt.getTime()) && startsAt.getTime() > Date.now() + 36 * 60 * 60 * 1000;
};

export default function MisReservas({ user, token, onLogout, Layout }) {
  const [reservations, setReservations] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => getMisReservas(token)
    .then((data) => setReservations(Array.isArray(data) ? data : []))
    .catch((err) => err.status === 401 ? onLogout() : setError(err.message));

  useEffect(() => { load(); }, []);

  const cancel = async (reservation) => {
    setMsg('');
    setError('');
    if (!canCancel(reservation)) return setError('Solo podés cancelar reservas con más de 36 horas de anticipación.');

    try {
      await cancelReserva(token, reservation.id);
      setMsg('Reserva cancelada.');
      load();
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <p className="eyebrow">Deportes</p>
      <h1>MisReservas</h1>
      <p className="muted">Tus reservas deportivas confirmadas y canceladas.</p>
      {msg && <p className="ok notice">{msg}</p>}
      {error && <p className="error notice">{error}</p>}
      {reservations.map((reservation) => (
        <article className="res-card elevated-card" key={reservation.id}>
          <div className="card-top">
            <div><p className="eyebrow">Cancha</p><strong>{reservation.court}</strong></div>
            <div className="date-pill"><b>{reservation.date}</b><span>{reservation.time}</span></div>
          </div>
          <p><b>Estado:</b> {reservation.status}</p>
          <button className="btn light full" type="button" disabled={!canCancel(reservation)} onClick={() => cancel(reservation)}>Cancelar</button>
          {!canCancel(reservation) && <p className="muted small">Disponible solo hasta 36 horas antes del horario reservado.</p>}
        </article>
      ))}
      {!reservations.length && <p className="empty-state">No tenés reservas deportivas.</p>}
    </Layout>
  );
}
