import React from 'react';
import DatePill from '../ui/DatePill.jsx';

export default function PartidoCard({ partido, onJoin, joining }) {
  return (
    <article className="border border-border rounded-xl p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">{partido.deporte}</p>
          <p className="text-[14px] font-semibold mt-0.5">{partido.nivel}</p>
        </div>
        <DatePill date={partido.fecha} time={partido.horario} />
      </div>
      <div className="flex items-center gap-4 text-[13px] text-text-secondary mb-3">
        <span>Faltan: <strong className="text-text">{partido.jugadoresFaltantes}</strong></span>
        <span className="text-border">·</span>
        <span>{partido.estado}</span>
      </div>
      <button
        onClick={() => onJoin(partido.id)}
        disabled={joining}
        className="w-full py-2.5 bg-accent text-white text-[13px] font-medium rounded-lg active:scale-[0.99] transition-all disabled:opacity-40 hover:bg-accent-hover"
      >
        {joining ? 'Uniendo...' : 'Unirme'}
      </button>
    </article>
  );
}
