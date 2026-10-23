
import { useState } from 'react';
import '../Registro.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Registro() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
    idComunidad: '1',
    nroSocio: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje('');
    setCargando(true);

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          idComunidad: Number(form.idComunidad)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo completar el registro');
      }

      setError(false);
      setMensaje(data.message || '¡Registro exitoso!');
    } catch (err) {
      setError(true);
      setMensaje(err.message || 'Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="registro-page">
      <form className="registro-card" onSubmit={handleSubmit}>
        <h1>Crear cuenta</h1>
        <p>Sumate a tu comunidad en Comuni+.</p>

        <div className="registro-grid">
          <label>
            Nombre
            <input name="nombre" value={form.nombre}
              onChange={handleChange} required />
          </label>

          <label>
            Apellido
            <input name="apellido" value={form.apellido}
              onChange={handleChange} required />
          </label>

          <label className="registro-full">
            Email
            <input name="email" type="email" value={form.email}
              onChange={handleChange} required />
          </label>

          <label className="registro-full">
            Contraseña
            <input name="password" type="password"
              value={form.password} onChange={handleChange}
              minLength={8} required />
          </label>

          <label className="registro-full">
            Teléfono
            <input name="telefono" type="tel" value={form.telefono}
              onChange={handleChange} required />
          </label>

          <label className="registro-full">
            Comunidad
            <select name="idComunidad" value={form.idComunidad}
              onChange={handleChange} required>
              <option value="1">Club Náutico Hacoaj</option>
            </select>
          </label>

          <label className="registro-full">
            Número de socio
            <input name="nroSocio" value={form.nroSocio}
              onChange={handleChange} />
          </label>
        </div>

        {mensaje && (
          <p className={error ? 'registro-error' : 'registro-exito'}>
            {mensaje}
          </p>
        )}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>
    </main>
  );
}
