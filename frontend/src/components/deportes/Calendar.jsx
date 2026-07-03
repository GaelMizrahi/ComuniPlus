import React from 'react';

export default function Calendar({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="calendar-section">
      <h3>Fecha de reserva</h3>

      <input
        type="date"
        value={value}
        min={today}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
} 