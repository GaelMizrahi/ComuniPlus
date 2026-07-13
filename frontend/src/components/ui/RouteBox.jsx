import React from 'react';

export default function RouteBox({ origin, destination }) {
  return (
    <div className="flex items-center gap-3 bg-surface-secondary rounded-lg px-3 py-2.5 my-3">
      <span className="text-[13px] font-medium text-text truncate flex-1">{origin}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
      <span className="text-[13px] font-medium text-text truncate flex-1 text-right">{destination}</span>
    </div>
  );
}
