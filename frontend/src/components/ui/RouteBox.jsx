import React from 'react';

export default function RouteBox({ origin, destination }) {
  return (
    <div className="flex items-center gap-3 bg-surface-secondary/70 rounded-2xl px-4 py-3 my-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted mb-0.5">Origen</p>
        <p className="text-[13px] font-semibold text-text truncate">{origin}</p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0 px-1">
        <div className="w-[5px] h-[5px] rounded-full bg-accent/30" />
        <div className="w-px h-2.5 bg-border" />
        <div className="w-[5px] h-[5px] rounded-full bg-accent" />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted mb-0.5">Destino</p>
        <p className="text-[13px] font-semibold text-text truncate">{destination}</p>
      </div>
    </div>
  );
}
