import React from 'react';

export default function SportFilter({ sports, selectedSport, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5">
      {sports.map((sport) => (
        <button
          key={sport}
          type="button"
          onClick={() => onSelect(sport)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150
            ${selectedSport === sport
              ? 'bg-text text-white'
              : 'bg-transparent text-text-secondary border border-border hover:border-text/20 hover:text-text'
            }`}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}
