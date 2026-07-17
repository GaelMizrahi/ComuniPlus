import React from 'react';

export default function Calendar({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">Fecha</p>
      <input
        type="date"
        value={value}
        min={today}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-3 px-4 bg-surface border border-border rounded-2xl text-[15px] font-medium text-text outline-none transition-all duration-200 focus:border-accent focus:shadow-input"
      />
    </div>
  );
}
