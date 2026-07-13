import React from 'react';

export default function EmptyState({ icon = '○', message, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <span className="text-3xl text-text-muted mb-3">{icon}</span>
      <p className="text-[14px] text-text-muted max-w-[220px] leading-relaxed">{message}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2 bg-text text-white text-[13px] font-medium rounded-lg active:scale-[0.98] transition-transform"
        >
          {action}
        </button>
      )}
    </div>
  );
}
