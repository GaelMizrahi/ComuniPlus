import React from 'react';

export default function Calendar({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <label>FECHA DE RESERVA</label>

      <input
        className="field"
        type="date"
        min={today}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  );
}