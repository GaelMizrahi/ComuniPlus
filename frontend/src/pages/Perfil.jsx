import React from 'react';
import Layout from '../components/layout/Layout.jsx';
import ElevatedCard from '../components/ui/ElevatedCard.jsx';

const menuItems = [
  { label: 'Notificaciones', desc: 'Gestioná tus alertas' },
  { label: 'Privacidad', desc: 'Configuración de cuenta' },
  { label: 'Ayuda', desc: 'Preguntas frecuentes' },
  { label: 'Acerca de', desc: 'Comuni+ v1.0' },
];

export default function Perfil({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="PERFIL">
      <div className="flex flex-col items-center text-center mb-8 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-text flex items-center justify-center text-white text-[22px] font-semibold mb-3">
          {user.fullName?.[0] || 'C'}
        </div>
        <h2 className="text-[18px] font-semibold">{user.fullName}</h2>
        <p className="text-[13px] text-text-muted mt-0.5">{user.community}</p>
        <p className="text-[12px] text-text-muted">Socio #{user.nroSocio}</p>
      </div>

      <div className="flex flex-col gap-2 mb-8">
        {menuItems.map((item) => (
          <ElevatedCard key={item.label} className="flex items-center gap-3 p-4 active:scale-[0.99]">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">{item.label}</p>
              <p className="text-[12px] text-text-muted mt-[1px]">{item.desc}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </ElevatedCard>
        ))}
      </div>

      <button onClick={onLogout} className="w-full py-3 text-[13px] font-medium text-text-muted hover:text-danger transition-colors">
        Cerrar sesión
      </button>
    </Layout>
  );
}
