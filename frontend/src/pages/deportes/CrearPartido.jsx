import React from 'react';
import { Link } from 'react-router-dom';

export default function CrearPartido({ user, onLogout, Layout }) {
  return (
    <Layout user={user} onLogout={onLogout} active="DEPORTES">
      <p className="eyebrow">¿Falta un jugador?</p>
      <h1>Crear partido</h1>
      <p className="muted">La creación de convocatorias estará disponible próximamente.</p>
      <Link to="/deportes/falta-jugador" className="btn light full back-link">Volver a partidos disponibles</Link>
    </Layout>
  );
}
