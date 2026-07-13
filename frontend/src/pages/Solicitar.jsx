import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import Toast from '../components/ui/Toast.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';
const jsonHeaders = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

export default function Solicitar({ user, token, onLogout }) {
  const nav = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ origin: '', destination: '', date: '', departureTime: '', seatsNeeded: 2 });

  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.seatsNeeded < 1 || form.seatsNeeded > 4) return setToast({ message: 'Lugares: 1 a 4', type: 'error' });
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/rides/request`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(form) });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      if (!res.ok) return setToast({ message: data.message || 'Error', type: 'error' });
      setToast({ message: 'Solicitud publicada', type: 'success' });
      setTimeout(() => nav('/viajes'), 1000);
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally { setLoading(false); }
  };

  const inputClass = "w-full px-0 py-3 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent";

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-medium text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <SectionHeader eyebrow="Transporte" title="Pedir viaje" />

      <form onSubmit={submit} className="flex flex-col gap-1 mt-2">
        <input value={form.origin} onChange={(e) => change('origin', e.target.value)} placeholder="Origen" className={inputClass} required />
        <input value={form.destination} onChange={(e) => change('destination', e.target.value)} placeholder="Destino" className={inputClass} required />

        <div className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-1">Fecha</p>
            <input type="date" value={form.date} onChange={(e) => change('date', e.target.value)} className="w-full py-2 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none focus:border-accent transition-colors" required />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-1">Hora</p>
            <input type="time" value={form.departureTime} onChange={(e) => change('departureTime', e.target.value)} className="w-full py-2 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none focus:border-accent transition-colors" required />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-2">Lugares</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => change('seatsNeeded', Math.max(1, form.seatsNeeded - 1))} className="w-10 h-10 rounded-full border border-border text-text text-lg font-light flex items-center justify-center active:scale-95 transition-transform">−</button>
            <span className="text-[18px] font-semibold min-w-[24px] text-center">{form.seatsNeeded}</span>
            <button type="button" onClick={() => change('seatsNeeded', Math.min(4, form.seatsNeeded + 1))} className="w-10 h-10 rounded-full border border-border text-text text-lg font-light flex items-center justify-center active:scale-95 transition-transform">+</button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-8 bg-text text-white text-[14px] font-medium rounded-lg active:scale-[0.98] transition-all disabled:opacity-40 hover:bg-text/90"
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
    </Layout>
  );
}
