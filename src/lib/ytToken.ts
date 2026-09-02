import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const YT_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

/**
 * Obtiene un token de YouTube válido, renovándolo automáticamente si ha caducado.
 * Devuelve null si el usuario no ha vinculado su cuenta de YouTube.
 */
export async function getValidYtToken(): Promise<string | null> {
  let token = localStorage.getItem('youtube_access_token');
  const refreshToken = localStorage.getItem('youtube_refresh_token');

  if (!token && !refreshToken) return null;

  // Si no hay access_token pero sí refresh_token, renovar
  if (!token && refreshToken) {
    token = await refreshYtToken(refreshToken);
  }

  return token;
}

/**
 * Dada una respuesta 401, renueva el token y devuelve el nuevo.
 */
export async function handleYt401(refreshToken: string | null): Promise<string | null> {
  if (!refreshToken) {
    localStorage.removeItem('youtube_access_token');
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { msg: 'Token de YouTube expirado. Ve a Perfil para re-vincular.', type: 'error' }
    }));
    return null;
  }
  return refreshYtToken(refreshToken);
}

async function refreshYtToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: YT_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('youtube_access_token', data.access_token);
      return data.access_token;
    }
  } catch (e) {
    console.error('Error renovando token de YT:', e);
  }
  
  // Si llegamos aquí, el refresh token es inválido o expiró
  console.warn("🛡 Auto-Purga en ytToken: Refresh token expirado o revocado.");
  localStorage.removeItem('youtube_access_token');
  localStorage.removeItem('youtube_refresh_token');
  window.dispatchEvent(new CustomEvent('show-toast', {
    detail: { msg: 'Sesión de YouTube expirada. Ve a Perfil para re-vincular.', type: 'error' }
  }));
  return null;
}

/**
 * Hace una petición autenticada a la YouTube Data API v3.
 * Maneja automáticamente la renovación del token si recibe un 401.
 */
export async function ytApiFetch(url: string): Promise<any | null> {
  let token = await getValidYtToken();
  if (!token) return null;

  let res = await tauriFetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('youtube_refresh_token');
    token = await handleYt401(refreshToken);
    if (!token) return null;
    res = await tauriFetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }

  if (!res.ok) {
    console.error(`YT API error ${res.status} en: ${url}`);
    return null;
  }

  return res.json();
}
