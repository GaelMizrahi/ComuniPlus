import React from 'react';
import { Link } from 'react-router-dom';

export default function TopBar({ user }) {
  return (
    <header className="sticky top-0 z-50 h-[56px] bg-bg/80 backdrop-blur-xl border-b border-border-subtle flex items-center gap-3 px-6">
      <Link to="/home" className="text-[17px] font-extrabold tracking-[-0.03em]">
        <span className="text-accent">Comuni+</span>
      </Link>

      {user?.fullName && (
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[12px] font-medium text-text-muted hidden sm:inline">
            {user.fullName}
          </span>

          <img
            src={user.foto}
            alt={user.fullName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-surface"
          />
        </div>
      )}
    </header>
  );
}