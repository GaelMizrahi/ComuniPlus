import React from 'react';

export default function ElevatedCard({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-xl transition-all duration-150 ${
        onClick ? 'cursor-pointer active:scale-[0.99] hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
