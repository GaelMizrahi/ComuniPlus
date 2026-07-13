import React from 'react';

export default function FAB({ onClick, children, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary hover:bg-primary-dark shadow-fab',
    success: 'bg-success hover:bg-success/90 shadow-[0_4px_16px_rgba(59,141,63,0.35)]',
    danger: 'bg-danger hover:bg-danger/90 shadow-[0_4px_16px_rgba(239,68,68,0.35)]',
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
