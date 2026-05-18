const envApi = import.meta.env.VITE_API_URL;
const API =
  envApi !== undefined && envApi !== ''
    ? envApi
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:5000';

export { API };

/**
 * Centralized fetch wrapper with credentials and JSON parsing.
 * Redirects to /login on 401.
 */
export async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(`${API}${url}`, {
      credentials: 'include',
      ...options,
    });
    if (res.status === 401) {
      // Prevent infinite reload loop if already on an auth page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('apiFetch error:', url, err);
    return null;
  }
}

/**
 * POST JSON helper
 */
export async function apiPost(url, body) {
  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * PUT JSON helper
 */
export async function apiPut(url, body) {
  return apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * DELETE helper
 */
export async function apiDelete(url) {
  return apiFetch(url, { method: 'DELETE' });
}

/**
 * POST FormData helper (for file uploads)
 */
export async function apiPostForm(url, formData) {
  return apiFetch(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * PUT FormData helper
 */
export async function apiPutForm(url, formData) {
  return apiFetch(url, {
    method: 'PUT',
    body: formData,
  });
}
