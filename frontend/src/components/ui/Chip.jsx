import React from 'react';

export default function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-150
        ${active
          ? 'bg-text text-white'
          : 'bg-transparent text-text-secondary border border-border hover:border-text/20 hover:text-text'
        } ${className}`}
    >
      {children}
    </button>
  );
}
