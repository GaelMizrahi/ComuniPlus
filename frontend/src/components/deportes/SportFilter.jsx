import React from 'react';

export default function SportFilter({ sports, selectedSport, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
      {sports.map((sport) => (
        <button
          key={sport}
          type="button"
          onClick={() => onSelect(sport)}
          className={`shrink-0 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-all duration-200
            ${selectedSport === sport
              ? 'bg-accent text-white shadow-fab'
              : 'bg-surface text-text-secondary border border-border hover:border-accent/30 hover:text-accent'
            }`}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}
