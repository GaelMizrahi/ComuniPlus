import React from 'react';

export default function ReservationSummary({ court, date, time }) {
  if (!court || !date || !time) return null;
  const total = Number(court.pricePerHour ?? 0);

  return (
    <div className="bg-surface-secondary rounded-xl p-4 my-4 animate-fade-in">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-3">Resumen</p>
      <div className="space-y-2">
        {[
          ['Cancha', court.name],
          ['Fecha', date],
          ['Horario', time],
          ['Precio/hora', `$${court.pricePerHour}`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-[13px]">
            <span className="text-text-muted">{label}</span>
            <span className="font-medium text-text">{value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-[13px] font-semibold text-text">Total</span>
        <span className="text-[15px] font-semibold text-text">${total}</span>
      </div>
    </div>
  );
}
