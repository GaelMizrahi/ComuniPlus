import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';

const modules = [
  { key: 'deportes', title: 'Deportes', desc: 'Reservá canchas, encontrá jugadores', to: '/deportes', icon: '⚽' },
  { key: 'viajes', title: 'Transporte', desc: 'Coordiná traslados con tu club', to: '/viajes', icon: '🚗' },
  { key: 'mercado', title: 'Mercado', desc: 'Comprá y vendé en tu comunidad', to: '/mercado', icon: '🛍' },
  { key: 'consultas', title: 'Consultas', desc: 'Preguntas y respuestas', to: null, icon: '💬' },
];

export default function Home({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="HOME">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-[13px] text-text-muted mb-1">{user.community}</p>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
          Hola, {user.fullName?.split(' ')[0]}
        </h1>
      </div>

      {/* Module List */}
      <div className="flex flex-col gap-2">
        {modules.map((mod) => {
          const Wrapper = mod.to ? Link : 'div';
          const props = mod.to ? { to: mod.to } : {};
          return (
            <Wrapper
              key={mod.key}
              {...props}
              className={`flex items-center gap-4 p-4 bg-surface border border-border rounded-xl transition-all duration-150 ${
                mod.to
                  ? 'cursor-pointer active:scale-[0.99] hover:shadow-sm'
                  : 'opacity-40 cursor-default'
              }`}
            >
              <span className="text-[20px] w-10 h-10 flex items-center justify-center bg-surface-secondary rounded-lg shrink-0">
                {mod.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-text">{mod.title}</h3>
                <p className="text-[13px] text-text-muted mt-[1px] truncate">{mod.desc}</p>
              </div>
              {mod.to && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              {!mod.to && (
                <span className="text-[11px] font-medium text-text-muted shrink-0">Próximo</span>
              )}
            </Wrapper>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full mt-10 py-2.5 text-[13px] font-medium text-text-muted hover:text-danger transition-colors"
      >
        Cerrar sesión
      </button>
    </Layout>
  );
}
