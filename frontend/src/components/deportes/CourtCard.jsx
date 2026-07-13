import React from 'react';

export default function CourtCard({ court, selected, onSelect }) {
  return (
    <article
      onClick={() => onSelect(court)}
      className={`border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99] ${
        selected ? 'border-accent ring-1 ring-accent/20 shadow-sm' : 'border-border hover:shadow-sm'
      }`}
    >
      <img src={court.image || 'https://placehold.co/640x360/f5f5f5/d4d4d4?text=Cancha'} alt={court.name} className="w-full h-32 object-cover" />
      <div className="p-3">
        <h4 className="text-[14px] font-semibold">{court.name}</h4>
        <p className="text-[12px] text-text-muted mt-0.5">{court.location}</p>
        <p className="text-[14px] font-semibold mt-1">${court.pricePerHour}<span className="text-[12px] font-normal text-text-muted">/h</span></p>
      </div>
    </article>
  );
}
