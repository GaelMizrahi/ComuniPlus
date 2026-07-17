import React from 'react';
import TopBar from './TopBar.jsx';
import BottomNav from './BottomNav.jsx';

export default function Layout({ user, onLogout, active, children }) {
  return (
    <main className="max-w-[430px] mx-auto min-h-screen bg-bg relative animate-fade-in">
      <TopBar user={user} />
      <section className="px-6 pt-7 pb-28">
        {children}
      </section>
      <BottomNav active={active} />
    </main>
  );
}
