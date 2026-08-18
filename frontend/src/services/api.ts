const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `API error ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function checkHealth() {
  // Health endpoint is at root, not under /api/v1
  // In production, BASE_URL points to the backend (e.g. https://...run.app/api/v1)
  // so we strip /api/v1 to get the backend base URL for /health
  const backendBase = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return fetch(`${backendBase}/health`).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });
}

export { apiFetch, BASE_URL };
