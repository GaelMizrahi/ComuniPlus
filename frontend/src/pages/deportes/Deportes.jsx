import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';

export default function Deportes({ user, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      <div className="mb-8">
        <p className="text-[13px] text-text-muted mb-1">Actividades</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Deportes</h1>
      </div>

      <div className="flex flex-col gap-2">
        <Link to="/deportes/reservas" className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.99] hover:shadow-sm">
          <span className="text-[20px] w-10 h-10 flex items-center justify-center bg-surface-secondary rounded-lg shrink-0">🏟</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-text">Reservas deportivas</h3>
            <p className="text-[13px] text-text-muted mt-[1px]">Reservá canchas y horarios</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
        </Link>

        <Link to="/deportes/falta-jugador" className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.99] hover:shadow-sm">
          <span className="text-[20px] w-10 h-10 flex items-center justify-center bg-surface-secondary rounded-lg shrink-0">🙋</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-text">¿Falta un jugador?</h3>
            <p className="text-[13px] text-text-muted mt-[1px]">Sumate a partidos abiertos</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
        </Link>
      </div>
    </L>
  );
}
