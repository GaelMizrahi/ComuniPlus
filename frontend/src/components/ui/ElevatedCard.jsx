import React from 'react';

export default function ElevatedCard({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-[18px] shadow-butter transition-all duration-300 ${
        onClick
          ? 'cursor-pointer active:scale-[0.98] hover:shadow-butter-lg'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
