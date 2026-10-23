import React from 'react';
import DatePill from '../ui/DatePill.jsx';

export default function PartidoCard({ partido, onJoin, joining }) {
  return (
    <article className="bg-surface rounded-[18px] shadow-butter p-4 animate-fade-in transition-all duration-300 hover:shadow-butter-lg">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">{partido.deporte}</p>
          <p className="text-[15px] font-bold mt-0.5 text-text">{partido.nivel}</p>
        </div>
        <DatePill date={partido.fecha} time={partido.horario} />
      </div>
      <div className="flex items-center gap-4 text-[13px] text-text-secondary mb-4">
        <span>Faltan: <strong className="text-text font-bold">{partido.jugadoresFaltantes}</strong></span>
        <span className="text-border">·</span>
        <span className="font-medium">{partido.estado}</span>
      </div>
      <button
        onClick={() => onJoin(partido.id)}
        disabled={joining}
        className="w-full py-3 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.98] transition-all duration-200 disabled:opacity-40"
      >
        {joining ? 'Uniendo...' : 'Unirme'}
      </button>
    </article>
  );
}
