import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import ClubLogo from '../components/ui/ClubLogo.jsx';

const modules = [
  { key: 'deportes', title: 'Deportes', desc: 'Reservá canchas y encontrá jugadores', to: '/deportes', color: '#0ea472', icon: 'deportes' },
  { key: 'viajes', title: 'Transporte', desc: 'Coordiná traslados con tu club', to: '/viajes', color: '#3b6cf5', icon: 'viajes' },
  { key: 'mercado', title: 'Mercado', desc: 'Comprá y vendé en tu comunidad', to: '/mercado', color: '#e8930c', icon: 'mercado' },
  { key: 'consultas', title: 'Consultas', desc: 'Preguntas y respuestas', to: null, color: '#8e99ab', icon: 'consultas' },
  { key: 'noticias', title: 'Noticias', desc: 'Novedades y anuncios de tu club', to: '/noticias', color: '#7653ce', icon: 'noticias' },
];

function ModuleIcon({ type, color }) {
  const icons = {
    deportes: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    viajes: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5a1 1 0 0 1-1 1h-1" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    mercado: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    noticias: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h10M7 15h4M7 18h10"/></svg>
    ),
    consultas: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  };
  return (
    <div
      className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0"
      style={{ backgroundColor: color }}
    >
      {icons[type]}
    </div>
  );
}

export default function Home({ user, onLogout }) {
  const firstName = user.fullName?.split(' ')[0];

  return (
    <Layout user={user} onLogout={onLogout} active="HOME">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-text">
          Hola, {firstName}
        </h1>
        <div className="flex items-center gap-3 mt-3">
          <ClubLogo src={user.communityLogo} name={user.community} />
          <p className="text-[14px] text-text-muted font-medium">{user.community}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {modules.map((mod, i) => {
          const isDisabled = !mod.to;
          const Wrapper = mod.to ? Link : 'div';
          const wrapperProps = mod.to ? { to: mod.to } : {};

          return (
            <Wrapper
              key={mod.key}
              {...wrapperProps}
              className={`flex items-center gap-3.5 px-4 py-3.5 bg-surface rounded-[18px] shadow-butter transition-all duration-300 ${
                isDisabled
                  ? 'opacity-40 cursor-default'
                  : 'cursor-pointer active:scale-[0.98] hover:shadow-butter-lg'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ModuleIcon type={mod.icon} color={mod.color} />

              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-text leading-tight">{mod.title}</h3>
                <p className="text-[12px] text-text-muted mt-[1px] truncate font-medium">{mod.desc}</p>
              </div>

              {!isDisabled && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              {isDisabled && (
                <span className="text-[10px] font-semibold text-text-muted bg-surface-secondary px-2 py-0.5 rounded-full shrink-0">Próximamente</span>
              )}
            </Wrapper>
          );
        })}
      </div>

      <button
        onClick={onLogout}
        className="w-full mt-10 py-3 text-[13px] font-medium text-text-muted hover:text-danger transition-colors duration-200"
      >
        Cerrar sesión
      </button>
    </Layout>
  );
}
