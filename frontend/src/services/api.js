// Production is served by Express at the same origin, keeping cookies first-party.
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : `http://${window.location.hostname}:4000`);

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include' });
  if (response.status === 401 && !['/api/login', '/api/session'].includes(path)) {
    window.dispatchEvent(new Event('session-expired'));
  }
  return response;
}
