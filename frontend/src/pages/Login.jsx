import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || 'Credenciales inválidas');
      onLogin(data.user, data.token);
      nav('/home');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-8 animate-fade-in relative overflow-hidden">
      <div className="w-full max-w-[340px]">
        <div className="mb-14">
          <h1 className="text-[32px] font-extrabold tracking-[-0.04em] mb-2">
            <span className="text-accent">Comuni+</span>
          </h1>
          <p className="text-[14px] text-text-muted font-medium">Ingresá a tu comunidad</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-0">
          <div className="mb-1">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full py-3 px-0 bg-transparent border-0 border-b-[1.5px] border-border text-[15px] font-medium text-text outline-none transition-all duration-200 placeholder:text-text-muted/40 focus:border-accent"
              required
            />
          </div>
          <div className="mt-5">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-3 px-0 bg-transparent border-0 border-b-[1.5px] border-border text-[15px] font-medium text-text outline-none transition-all duration-200 placeholder:text-text-muted/40 focus:border-accent"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-5 p-3 bg-danger-light rounded-xl animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[13px] font-semibold text-danger">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-10 bg-accent text-white text-[15px] font-bold rounded-xl shadow-fab transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
