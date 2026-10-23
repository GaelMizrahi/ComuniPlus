import React from 'react';

export default function FAB({ onClick, children, color = 'primary' }) {
  const colors = {
    primary: 'bg-accent shadow-fab',
    success: 'bg-success shadow-[0_4px_16px_rgba(14,164,114,0.30)]',
    danger: 'bg-danger shadow-[0_4px_16px_rgba(229,62,62,0.30)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-extrabold text-white transition-all duration-200 active:scale-95 hover:-translate-y-0.5 ${colors[color] || colors.primary}`}
    >
      {children}
    </button>
  );
}
