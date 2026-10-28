import { apiFetch } from './api.js';
const jsonHeaders = () => ({ 'Content-Type': 'application/json' });

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Error de servidor');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getPartidosFaltaJugador(deporte) {
  const query = deporte && deporte !== 'Todos' ? `?deporte=${encodeURIComponent(deporte)}` : '';
  const response = await apiFetch(`/api/falta-jugador/partidos${query}`, {});
  return parseResponse(response);
}

export async function unirseAPartido(partidoId) {
  const response = await apiFetch(`/api/falta-jugador/partidos/${partidoId}/unirse`, {
    method: 'POST',
    headers: jsonHeaders()
  });
  return parseResponse(response);
}
