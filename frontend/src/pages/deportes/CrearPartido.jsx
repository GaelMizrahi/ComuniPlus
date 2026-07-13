import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import Toast from '../../components/ui/Toast.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

export default function CrearPartido({ user, onLogout, Layout: LayoutProp }) {
  const L = LayoutProp || Layout;
  const nav = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ deporte: 'Tenis', titulo: '', descripcion: '', dia: '', horario: '', lugar: '', jugadoresNecesarios: 1 });

  function getToken() { return user?.token || localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken'); }

  function handleChange(e) { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/partidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, jugadoresNecesarios: Number(form.jugadoresNecesarios) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setToast({ message: 'Partido creado', type: 'success' });
      setTimeout(() => nav('/deportes/falta-jugador'), 1000);
    } catch (err) { setToast({ message: err.message, type: 'error' }); } finally { setLoading(false); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const inputClass = "w-full px-0 py-3 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent";

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-medium text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-1">Deportes</p>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-6">Crear partido</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-2">Deporte</p>
          <select name="deporte" value={form.deporte} onChange={handleChange} className="w-full py-3 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none focus:border-accent transition-colors appearance-none" required>
            <option>Tenis</option><option>Fútbol masculino</option><option>Fútbol femenino</option><option>Básquet</option><option>Pádel</option><option>Hockey</option><option>Vóley</option><option>Patín</option><option>Gimnasia Artística</option>
          </select>
        </div>

        <input type="text" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título" className={inputClass} required />
        <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción (opcional)" rows={3} className={`${inputClass} resize-none border-b`} />

        <div className="grid grid-cols-2 gap-6 mt-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-1">Fecha</p>
            <input type="date" name="dia" value={form.dia} min={today} onChange={handleChange} className="w-full py-2 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none focus:border-accent transition-colors" required />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-1">Horario</p>
            <input type="time" name="horario" value={form.horario} onChange={handleChange} className="w-full py-2 bg-transparent border-0 border-b border-border text-[15px] text-text outline-none focus:border-accent transition-colors" required />
          </div>
        </div>

        <input type="text" name="lugar" value={form.lugar} onChange={handleChange} placeholder="Lugar" className={inputClass} required />

        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted mb-2">Jugadores necesarios</p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setForm((p) => ({ ...p, jugadoresNecesarios: Math.max(1, p.jugadoresNecesarios - 1) }))} className="w-10 h-10 rounded-full border border-border text-text text-lg font-light flex items-center justify-center active:scale-95 transition-transform">−</button>
            <span className="text-[18px] font-semibold min-w-[24px] text-center">{form.jugadoresNecesarios}</span>
            <button type="button" onClick={() => setForm((p) => ({ ...p, jugadoresNecesarios: Math.min(20, p.jugadoresNecesarios + 1) }))} className="w-10 h-10 rounded-full border border-border text-text text-lg font-light flex items-center justify-center active:scale-95 transition-transform">+</button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-3 mt-8 bg-text text-white text-[14px] font-medium rounded-lg active:scale-[0.98] transition-all disabled:opacity-40 hover:bg-text/90">
          {loading ? 'Creando...' : 'Crear partido'}
        </button>
      </form>
    </L>
  );
}
