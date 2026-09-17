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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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
    request('/storage/upload-url', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
  createVideo: (data: { title: string; description?: string; channelId: string; originalKey: string; isShort?: boolean }) =>
    request('/videos', { method: 'POST', body: JSON.stringify(data) }),
  listVideos: (limit = 20, offset = 0) => request(`/videos?limit=${limit}&offset=${offset}`),
  listShorts: (limit = 20, offset = 0) => request(`/videos/shorts?limit=${limit}&offset=${offset}`),
  searchVideos: (q: string, limit = 20, offset = 0) =>
    request(`/videos/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),
  getVideo: (id: string) => request(`/videos/${id}`),
  toggleLike: (videoId: string) => request(`/videos/${videoId}/likes/toggle`, { method: 'POST' }),
  isLiked: (videoId: string) => request(`/videos/${videoId}/likes/me`),
  listComments: (videoId: string) => request(`/videos/${videoId}/comments`),
  createComment: (videoId: string, text: string, parentId?: string) =>
    request(`/videos/${videoId}/comments`, { method: 'POST', body: JSON.stringify({ text, parentId }) }),
  deleteComment: (id: string) => request(`/comments/${id}`, { method: 'DELETE' }),
  toggleSubscribe: (channelId: string) =>
    request(`/channels/${channelId}/subscribe/toggle`, { method: 'POST' }),
  isSubscribed: (channelId: string) => request(`/channels/${channelId}/subscribe/me`),
  mySubscriptions: () => request('/subscriptions/me'),
  createPlaylist: (data: { title: string; description?: string; isPublic?: boolean }) =>
    request('/playlists', { method: 'POST', body: JSON.stringify(data) }),
  myPlaylists: () => request('/playlists/me'),
  getPlaylist: (id: string) => request(`/playlists/${id}`),
  updatePlaylist: (id: string, data: { title?: string; description?: string; isPublic?: boolean }) =>
    request(`/playlists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlaylist: (id: string) => request(`/playlists/${id}`, { method: 'DELETE' }),
  addToPlaylist: (playlistId: string, videoId: string) =>
    request(`/playlists/${playlistId}/videos`, { method: 'POST', body: JSON.stringify({ videoId }) }),
  removeFromPlaylist: (playlistId: string, videoId: string) =>
    request(`/playlists/${playlistId}/videos/${videoId}`, { method: 'DELETE' }),
  createLive: (data: { title: string; description?: string; channelId: string }) =>
    request('/live', { method: 'POST', body: JSON.stringify(data) }),
  listLive: (limit = 20, offset = 0) => request(`/live?limit=${limit}&offset=${offset}`),
  getLive: (id: string) => request(`/live/${id}`),
  endLive: (id: string) => request(`/live/${id}/end`, { method: 'POST' }),
  myLive: () => request('/live/me'),
  listNotifications: (limit = 30, unreadOnly = false) =>
    request(`/notifications?limit=${limit}${unreadOnly ? '&unread=1' : ''}`),
  unreadNotificationsCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', { method: 'POST' }),
};
