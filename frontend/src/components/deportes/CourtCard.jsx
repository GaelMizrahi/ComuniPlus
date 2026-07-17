import React from 'react';

export default function CourtCard({ court, selected, onSelect }) {
  return (
    <article
      onClick={() => onSelect(court)}
      className={`rounded-[18px] overflow-hidden cursor-pointer transition-all duration-300 active:scale-[0.98] ${
        selected
          ? 'ring-2 ring-accent shadow-glow'
          : 'shadow-butter hover:shadow-butter-lg'
      }`}
    >
      <img
        src={court.image || 'https://placehold.co/640x360/f1f3f8/8e99ab?text=Cancha'}
        alt={court.name}
        className="w-full h-32 object-cover bg-surface-secondary"
      />
      <div className="bg-surface p-4">
        <h4 className="text-[14px] font-bold text-text">{court.name}</h4>
        <p className="text-[12px] text-text-muted mt-0.5 font-medium">{court.location}</p>
        <p className="text-[15px] font-extrabold mt-2 text-text">${court.pricePerHour}<span className="text-[12px] font-medium text-text-muted">/h</span></p>
      </div>
    </article>
  );
}
