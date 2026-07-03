import React from 'react';
import { Link } from 'react-router-dom';

export default function Deportes({ user, onLogout, Layout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <div className="section-head">
        <div>
          <p className="eyebrow">Deportes</p>
          <h1>Deportes</h1>
        </div>
      </div>

      <p className="muted">
        Elegí cómo querés participar de las actividades deportivas de tu comunidad.
      </p>

      <div className="sports-menu">
        <Link to="/deportes/reservas" className="sports-menu-card elevated-card">
          <span className="sports-menu-icon">🏟️</span>
          <strong>Reservas deportivas</strong>
          <small>Reservá canchas y horarios disponibles.</small>
        </Link>

        <Link to="/deportes/falta-jugador" className="sports-menu-card elevated-card">
          <span className="sports-menu-icon">🙋</span>
          <strong>¿Falta un jugador?</strong>
          <small>Sumate a partidos o completá tu equipo.</small>
        </Link>
      </div>
    </Layout>
  );
}
