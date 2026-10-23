import React from 'react';

export default function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-all duration-200
        ${active
          ? 'bg-accent text-white shadow-fab'
          : 'bg-surface text-text-secondary border border-border hover:border-accent/30 hover:text-accent'
        } ${className}`}
    >
      {children}
    </button>
  );
}
