import React from 'react';

const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : 'Sin fecha';
const formatTime = (time) => time ? String(time).slice(0, 5) : '--:--';

export default function PartidoCard({ partido, onJoin, joining }) {
  return (
    <article className="res-card elevated-card match-card">
      <div className="card-top">
        <div>
          <p className="eyebrow">{partido.deporte}</p>
          <strong>{partido.nivel}</strong>
        </div>
        <div className="date-pill">
          <b>{formatDate(partido.fecha)}</b>
          <span>{formatTime(partido.horario)}</span>
        </div>
      </div>

      <div className="match-meta">
        <span><b>Jugadores faltantes:</b> {partido.jugadoresFaltantes}</span>
        <span><b>Estado:</b> {partido.estado}</span>
      </div>

      <button
        type="button"
        className="btn blue full"
        onClick={() => onJoin(partido.id)}
        disabled={joining}
      >
        {joining ? 'Uniendo...' : 'Unirme'}
      </button>
    </article>
  );
}
