import React from 'react';
import Layout from '../components/layout/Layout.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';

const menuItems = [
  { label: 'Notificaciones', desc: 'Gestiona tus alertas', icon: 'noti' },
  { label: 'Privacidad', desc: 'Configuración de cuenta', icon: 'priv' },
  { label: 'Ayuda', desc: 'Preguntas frecuentes', icon: 'help' },
  { label: 'Acerca de', desc: 'Comuni+ v1.0', icon: 'info' },
];

const menuIcons = {
  noti: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b6cf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  priv: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b6cf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  help: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b6cf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b6cf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export default function Perfil({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="PERFIL">
      <div className="flex flex-col items-center text-center mb-10 animate-fade-in">
        <img
          src={`https://i.pravatar.cc/160?u=${user.email || user.fullName}`}
          alt={user.fullName}
          className="w-20 h-20 rounded-full object-cover ring-4 ring-accent/10 mb-4"
        />
        <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{user.fullName}</h2>
        <p className="text-[13px] text-text-muted mt-1 font-medium">{user.community}</p>
        <p className="text-[12px] text-text-muted/60 mt-0.5 font-medium">Socio #{user.nroSocio}</p>
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {menuItems.map((item, i) => (
          <ElevatedCard key={item.label} className="flex items-center gap-3.5 p-4 active:scale-[0.98] cursor-pointer" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-10 h-10 rounded-[12px] bg-accent-light flex items-center justify-center shrink-0">
              {menuIcons[item.icon]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold">{item.label}</p>
              <p className="text-[12px] text-text-muted mt-[1px] font-medium">{item.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </ElevatedCard>
        ))}
      </div>

      <button onClick={onLogout}
        className="w-full py-3 text-[13px] font-medium text-text-muted hover:text-danger transition-colors duration-200">
        Cerrar sesión
      </button>
    </Layout>
  );
}
