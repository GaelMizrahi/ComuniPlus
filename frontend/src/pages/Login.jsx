import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

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

  const inputClass = "w-full px-0 py-3 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent";

  return (
    <div className="max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-8 animate-fade-in">
      <div className="w-full max-w-[320px]">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-text mb-1">
          Comuni<span className="text-accent">+</span>
        </h1>
        <p className="text-[14px] text-text-muted mb-10">Ingresá a tu comunidad</p>

        <form onSubmit={submit} className="flex flex-col gap-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={inputClass}
            required
          />

          {error && (
            <p className="text-[13px] text-danger mt-4 animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-8 bg-text text-white text-[14px] font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-40 hover:bg-text/90"
          >
            {loading ? 'Entrando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
