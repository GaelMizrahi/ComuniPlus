import { apiFetch } from './api.js';

export async function registrationRequest(path, { method = 'GET', body, signal } = {}) {
  const response = await apiFetch(`/api${path}`, {
    method, signal, headers: { ...(body ? { 'Content-Type':'application/json' } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'No se pudo completar la operación'), { status:response.status, code:data.code });
  return data;
}
