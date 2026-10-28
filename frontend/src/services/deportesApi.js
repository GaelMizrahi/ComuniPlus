import { apiFetch } from './api.js';

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
});

async function parseResponse(response) {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(
      text || 'El backend no devolvió JSON'
    );

    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data.message || 'Error de servidor'
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getDeportes(sport) {
  const query = sport
    ? `?deporte=${encodeURIComponent(sport)}`
    : '';

  const response = await apiFetch(`/api/deportes${query}`);

  return parseResponse(response);
}

export async function getHorarios(courtId, date) {
  const response = await apiFetch(`/api/deportes/${courtId}/horarios?fecha=${encodeURIComponent(date)}`);

  return parseResponse(response);
}

export async function createReserva(payload) {
  const response = await apiFetch(`/api/reservas`,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }
  );

  return parseResponse(response);
}

export async function getMisReservas() {
  const response = await apiFetch(`/api/reservas/mias?t=${Date.now()}`,
    {
      method: 'GET',
      cache: 'no-store'
    }
  );

  return parseResponse(response);
}

export async function cancelReserva(reservationId) {
  const response = await apiFetch(`/api/reservas/${reservationId}`,
    {
      method: 'DELETE'
    }
  );

  return parseResponse(response);
}

export async function createPartido(payload) {
  const response = await apiFetch(`/api/partidos`,
    {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    }
  );

  return parseResponse(response);
}

export async function getPartidos() {
  const response = await apiFetch(`/api/partidos`);

  return parseResponse(response);
}

export async function deletePartido(partidoId) {
  const response = await apiFetch(`/api/partidos/${partidoId}`,
    {
      method: 'DELETE'
    }
  );

  return parseResponse(response);
}