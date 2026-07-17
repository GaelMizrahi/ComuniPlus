import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';

const sportsModules = [
  { to: '/deportes/reservas', title: 'Reservas deportivas', desc: 'Reserva canchas y horarios', color: '#0ea472', iconPath: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  { to: '/deportes/falta-jugador', title: '¿Falta un jugador?', desc: 'Sumate a partidos abiertos', color: '#3b6cf5', iconPath: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
];

export default function Deportes({ user, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      <div className="mb-8">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">Deportes</h1>
        <p className="text-[13px] text-text-muted mt-1 font-medium">Actividades de tu comunidad</p>
      </div>

      <div className="flex flex-col gap-3">
        {sportsModules.map((mod, i) => (
          <Link
            key={mod.to}
            to={mod.to}
            className="flex items-center gap-3.5 px-4 py-4 bg-surface rounded-[18px] shadow-butter transition-all duration-300 cursor-pointer active:scale-[0.98] hover:shadow-butter-lg animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: mod.color }}
            >
              {mod.iconPath}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-text">{mod.title}</h3>
              <p className="text-[12px] text-text-muted mt-[1px] font-medium">{mod.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </L>
  );
}
