import React from 'react';

export default function ReservationSummary({ court, date, time }) {
  if (!court || !date || !time) return null;
  const total = Number(court.pricePerHour ?? 0);

  return (
    <div className="bg-accent-light/50 rounded-2xl p-5 my-5 border border-accent/5 animate-fade-in">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-4">Resumen</p>
      <div className="space-y-3">
        {[
          ['Cancha', court.name],
          ['Fecha', date],
          ['Horario', time],
          ['Precio/hora', `$${court.pricePerHour}`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-[13px]">
            <span className="text-text-muted font-medium">{label}</span>
            <span className="font-semibold text-text">{value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-accent/10 mt-3 pt-3 flex justify-between items-center">
        <span className="text-[14px] font-bold text-text">Total</span>
        <span className="text-[18px] font-extrabold text-accent">${total}</span>
      </div>
    </div>
  );
}
