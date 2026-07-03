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

export async function getDeportes(token, sport) {
  const query = sport ? `?deporte=${encodeURIComponent(sport)}` : '';
  const response = await fetch(`${API_URL}/api/deportes${query}`, { headers: authHeaders(token) });
  return parseResponse(response);
}

export async function getHorarios(token, courtId, date) {
  const response = await fetch(`${API_URL}/api/deportes/${courtId}/horarios?fecha=${encodeURIComponent(date)}`, { headers: authHeaders(token) });
  return parseResponse(response);
}

export async function createReserva(token, payload) {
  const response = await fetch(`${API_URL}/api/reservas`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function getMisReservas(token) {
  const response = await fetch(`${API_URL}/api/reservas/mias`, { headers: authHeaders(token) });
  return parseResponse(response);
}

export async function cancelReserva(token, reservationId) {
  const response = await fetch(`${API_URL}/api/reservas/${reservationId}`, { method: 'DELETE', headers: authHeaders(token) });
  return parseResponse(response);
}
