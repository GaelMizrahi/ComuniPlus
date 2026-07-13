import React from 'react';

export default function DatePill({ date, time }) {
  const formatDate = (d) => d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : '—';

  const formatTime = (t) => t ? String(t).slice(0, 5) : '—';

  return (
    <div className="text-right shrink-0">
      <p className="text-[13px] font-semibold text-text leading-tight">{formatDate(date)}</p>
      <p className="text-[12px] text-text-muted mt-0.5">{formatTime(time)}</p>
    </div>
  );
}
