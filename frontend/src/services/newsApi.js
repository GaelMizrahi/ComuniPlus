import { apiFetch } from './api.js';
export async function newsRequest(path = '', { method = 'GET', body, signal } = {}) {
  const response = await apiFetch(`/api/noticias${path}`, { method, signal,
    headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'No se pudo completar la operación'), { status: response.status });
  return data;
}
