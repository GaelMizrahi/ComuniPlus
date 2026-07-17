import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import SectionHeader from '../components/ui/SectionHeader.jsx';
import Toast from '../components/ui/Toast.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const jsonHeaders = (t) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

const inputClass = "w-full py-3 px-4 bg-surface border border-border rounded-2xl text-[15px] font-medium text-text outline-none transition-all duration-200 placeholder:text-text-muted/40 focus:border-accent focus:shadow-input";

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

  const inputGroup = (label, content) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">{label}</p>
      {content}
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout} active="VIAJES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-semibold text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <SectionHeader eyebrow="Transporte" title="Pedir viaje" />

      <form onSubmit={submit} className="flex flex-col gap-5 mt-2">
        {inputGroup('Origen',
          <input value={form.origin} onChange={(e) => change('origin', e.target.value)} placeholder="¿Salís de...?"
            className={inputClass} required />
        )}
        {inputGroup('Destino',
          <input value={form.destination} onChange={(e) => change('destination', e.target.value)} placeholder="¿Vas a...?"
            className={inputClass} required />
        )}

        <div className="grid grid-cols-2 gap-4">
          {inputGroup('Fecha',
            <input type="date" value={form.date} onChange={(e) => change('date', e.target.value)}
              className={inputClass} required />
          )}
          {inputGroup('Hora',
            <input type="time" value={form.departureTime} onChange={(e) => change('departureTime', e.target.value)}
              className={inputClass} required />
          )}
        </div>

        {inputGroup('Lugares',
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => change('seatsNeeded', Math.max(1, form.seatsNeeded - 1))}
              className="w-11 h-11 rounded-2xl border border-border bg-surface text-text text-lg font-light flex items-center justify-center active:scale-95 transition-all duration-200 hover:border-accent/40">
              −
            </button>
            <span className="text-[20px] font-extrabold min-w-[28px] text-center">{form.seatsNeeded}</span>
            <button type="button" onClick={() => change('seatsNeeded', Math.min(4, form.seatsNeeded + 1))}
              className="w-11 h-11 rounded-2xl border border-border bg-surface text-text text-lg font-light flex items-center justify-center active:scale-95 transition-all duration-200 hover:border-accent/40">
              +
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 mt-4 bg-accent text-white text-[15px] font-bold rounded-xl shadow-fab transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
    </Layout>
  );
}
