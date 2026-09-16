const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setToken(token: string) {
  localStorage.setItem('accessToken', token);
}

export function clearToken() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: any) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request('/users/me'),

  createChannel: (data: { name: string; description?: string }) =>
    request('/channels', { method: 'POST', body: JSON.stringify(data) }),

  myChannels: () => request('/channels/me'),

  getChannel: (slug: string) => request(`/channels/${slug}`),

  getUploadUrl: (filename: string, contentType: string) =>
    request('/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),

  createVideo: (data: {
    title: string;
    description?: string;
    channelId: string;
    originalKey: string;
    isShort?: boolean;
  }) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),

  listVideos: (limit = 20, offset = 0) =>
    request(`/videos?limit=${limit}&offset=${offset}`),

  getVideo: (id: string) => request(`/videos/${id}`),
};
