import React from 'react';

export default function Calendar({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mb-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-1">Fecha</p>
      <input
        type="date"
        value={value}
        min={today}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2.5 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none transition-colors focus:border-accent"
      />
    </div>
  );
}
