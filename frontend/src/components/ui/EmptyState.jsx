import React from 'react';

export default function EmptyState({ icon = '○', message, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mb-5">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-[15px] font-semibold text-text-secondary max-w-[240px] leading-relaxed">{message}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-2.5 bg-accent text-white text-[13px] font-bold rounded-xl shadow-fab active:scale-[0.97] transition-all duration-200"
        >
          {action}
        </button>
      )}
    </div>
  );
}
