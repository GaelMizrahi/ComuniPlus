import React from 'react';

export default function ReservationSummary({ court, date, time }) {
  if (!court || !date || !time) return null;

  const total = Number(court.pricePerHour ?? 0);

  return (
    <section className="reservation-summary elevated-card">
      <h3>Resumen</h3>

      <p>
        <span>Cancha</span>
        <b>{court.name}</b>
      </p>

      <p>
        <span>Fecha</span>
        <b>{date}</b>
      </p>

      <p>
        <span>Horario</span>
        <b>{time}</b>
      </p>

      <p>
        <span>Precio por hora</span>
        <b>${court.pricePerHour}</b>
      </p>

      <p className="total">
        <span>Total</span>
        <b>${total}</b>
      </p>
    </section>
  );
}