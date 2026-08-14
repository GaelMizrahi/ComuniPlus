import React from 'react';

export default function CourtCard({ court, selected, onSelect }) {
  return (
    <article
      className={`court-card elevated-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(court)}
    >
      <img
        src={
          court.image ||
          'https://placehold.co/640x360/e7f0ff/256fca?text=Comuni%2B'
        }
        alt={court.name}
      />

      <h3>{court.name}</h3>
      <p>{court.location}</p>
      <p>${court.pricePerHour}/hora</p>
    </article>
  );
}