const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function registrationRequest(path, { token, method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    method, signal, headers: { ...(token ? { Authorization:`Bearer ${token}` } : {}), ...(body ? { 'Content-Type':'application/json' } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'No se pudo completar la operación'), { status:response.status, code:data.code });
  return data;
}
