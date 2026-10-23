import React from 'react';

export default function DatePill({ date, time }) {
  const formatDate = (d) => {
    if (!d) return '—';
    const dateObj = new Date(`${d}T00:00:00`);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('es-AR', { month: 'short' });
    return { day, month };
  };

  const formatTime = (t) => t ? String(t).slice(0, 5) : '—';
  const result = formatDate(date);

  return (
    <div className="text-right shrink-0 bg-accent-light rounded-xl px-3 py-2 min-w-[68px]">
      {typeof result === 'object' ? (
        <>
          <p className="text-[16px] font-extrabold text-accent leading-tight">{result.day}</p>
          <p className="text-[10px] font-semibold text-accent/60 uppercase tracking-wider">{result.month}</p>
        </>
      ) : (
        <p className="text-[14px] font-semibold text-text">{result}</p>
      )}
      <p className="text-[11px] text-text-muted font-medium mt-0.5">{formatTime(time)}</p>
    </div>
  );
}
