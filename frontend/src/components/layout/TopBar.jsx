import React from 'react';
import { Link } from 'react-router-dom';

export default function TopBar({ user }) {
  return (
    <header className="sticky top-0 z-50 h-[56px] bg-surface/80 backdrop-blur-xl border-b border-border flex items-center gap-3 px-5">
      <Link to="/home" className="text-[17px] font-semibold tracking-[-0.02em] text-text">
        Comuni<span className="text-accent">+</span>
      </Link>
      {user?.fullName && (
        <span className="ml-auto text-[13px] text-text-muted">
          {user.fullName}
        </span>
      )}
    </header>
  );
}
