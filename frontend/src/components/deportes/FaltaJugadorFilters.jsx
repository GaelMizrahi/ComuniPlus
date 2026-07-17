import React from 'react';

export default function FaltaJugadorFilters({ sports, selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-6 px-6 scrollbar-none">
      {sports.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className={`shrink-0 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-all duration-200
            ${selected === s
              ? 'bg-accent text-white shadow-fab'
              : 'bg-surface text-text-secondary border border-border hover:border-accent/30 hover:text-accent'
            }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
