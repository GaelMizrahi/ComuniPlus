const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = (token) => ({ 'Content-Type': 'application/json', ...authHeaders(token) });

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Error de servidor');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getPartidosFaltaJugador(token, deporte) {
  const query = deporte && deporte !== 'Todos' ? `?deporte=${encodeURIComponent(deporte)}` : '';
  const response = await fetch(`${API_URL}/api/falta-jugador/partidos${query}`, { headers: authHeaders(token) });
  return parseResponse(response);
}

export async function unirseAPartido(token, partidoId) {
  const response = await fetch(`${API_URL}/api/falta-jugador/partidos/${partidoId}/unirse`, {
    method: 'POST',
    headers: jsonHeaders(token)
  });
  return parseResponse(response);
}
