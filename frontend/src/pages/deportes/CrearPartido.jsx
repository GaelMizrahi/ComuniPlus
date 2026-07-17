import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import Toast from '../../components/ui/Toast.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const inputClass = "w-full py-3 px-4 bg-surface border border-border rounded-2xl text-[15px] font-medium text-text outline-none transition-all duration-200 placeholder:text-text-muted/40 focus:border-accent focus:shadow-input";

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

  const inputGroup = (label, content) => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">{label}</p>
      {content}
    </div>
  );

  return (
    <L user={user} onLogout={onLogout} active="DEPORTES">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-[13px] font-semibold text-text-muted mb-6 active:opacity-60 transition-opacity">
        ← Volver
      </button>

      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1">Deportes</p>
      <h1 className="text-[24px] font-extrabold tracking-[-0.03em] mb-7">Crear partido</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {inputGroup('Deporte',
          <select name="deporte" value={form.deporte} onChange={handleChange}
            className={inputClass + " appearance-none"} required>
            <option>Tenis</option><option>Fútbol masculino</option><option>Fútbol femenino</option><option>Básquet</option><option>Pádel</option><option>Hockey</option><option>Vóley</option><option>Patín</option><option>Gimnasia Artística</option>
          </select>
        )}

        {inputGroup('Título',
          <input type="text" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Ej: Partido de tenis"
            className={inputClass} required />
        )}

        {inputGroup('Descripción',
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Detalles del partido (opcional)" rows={3}
            className={inputClass + " resize-none"} />
        )}

        <div className="grid grid-cols-2 gap-4">
          {inputGroup('Fecha',
            <input type="date" name="dia" value={form.dia} min={today} onChange={handleChange}
              className={inputClass} required />
          )}
          {inputGroup('Horario',
            <input type="time" name="horario" value={form.horario} onChange={handleChange}
              className={inputClass} required />
          )}
        </div>

        {inputGroup('Lugar',
          <input type="text" name="lugar" value={form.lugar} onChange={handleChange} placeholder="Ej: Cancha 3"
            className={inputClass} required />
        )}

        {inputGroup('Jugadores necesarios',
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setForm((p) => ({ ...p, jugadoresNecesarios: Math.max(1, p.jugadoresNecesarios - 1) }))}
              className="w-11 h-11 rounded-2xl border border-border bg-surface text-text text-lg font-light flex items-center justify-center active:scale-95 transition-all duration-200 hover:border-accent/40">
              −
            </button>
            <span className="text-[20px] font-extrabold min-w-[28px] text-center">{form.jugadoresNecesarios}</span>
            <button type="button" onClick={() => setForm((p) => ({ ...p, jugadoresNecesarios: Math.min(20, p.jugadoresNecesarios + 1) }))}
              className="w-11 h-11 rounded-2xl border border-border bg-surface text-text text-lg font-light flex items-center justify-center active:scale-95 transition-all duration-200 hover:border-accent/40">
              +
            </button>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3.5 mt-4 bg-accent text-white text-[15px] font-bold rounded-xl shadow-fab transition-all duration-200 active:scale-[0.98] disabled:opacity-40">
          {loading ? 'Creando...' : 'Crear partido'}
        </button>
      </form>
    </L>
  );
}
