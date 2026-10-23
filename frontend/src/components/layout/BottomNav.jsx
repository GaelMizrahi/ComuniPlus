import React from 'react';
import { Link } from 'react-router-dom';

const icons = {
  HOME: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  VIAJES: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  DEPORTES: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  MERCADO: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  PERFIL: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

const routeMap = {
  HOME: '/home',
  VIAJES: '/viajes',
  DEPORTES: '/deportes',
  MERCADO: '/mercado',
  PERFIL: '/perfil',
};

const labels = {
  HOME: 'Inicio',
  VIAJES: 'Viajes',
  DEPORTES: 'Deportes',
  MERCADO: 'Mercado',
  PERFIL: 'Perfil',
};

export default function BottomNav({ active }) {
  const items = ['HOME', 'VIAJES', 'DEPORTES', 'MERCADO', 'PERFIL'];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-surface/90 backdrop-blur-xl border-t border-border shadow-nav">
      <div className="flex justify-around items-center h-[62px] px-1">
        {items.map((key) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              to={routeMap[key]}
              className={`relative flex flex-col items-center gap-[3px] px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-accent'
                  : 'text-text-muted active:text-text-secondary'
              }`}
            >
              <span className={`transition-all duration-200 ${isActive ? 'scale-110 text-accent' : ''}`}>
                {icons[key]}
              </span>
              <span className={`text-[10px] transition-all duration-200 ${
                isActive ? 'font-semibold text-accent' : 'font-medium'
              }`}>
                {labels[key]}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 w-5 h-[3px] rounded-full bg-accent opacity-60" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
