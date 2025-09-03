// Configuración centralizada de API con URL absoluta
const BASE = import.meta.env.VITE_API_URL || '';

export const api = (path: string, init?: RequestInit) => {
  // Si no hay BASE configurada, usar ruta relativa (fallback)
  const url = BASE ? `${BASE}${path}` : path;
  console.log(`🌐 API: Llamando a ${url}`);
  return fetch(url, init);
};

// Guard para detectar si el hosting devolvió HTML en lugar de JSON
export const safeJson = async (res: Response) => {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) {
    console.error('🚨 API: Hosting devolvió HTML en lugar de JSON');
    console.error('🚨 API: Content-Type:', ct);
    console.error('🚨 API: Status:', res.status);
    throw new Error('El hosting devolvió HTML (probable fallback SPA en /api).');
  }
  return res.json();
};

// Uso seguro de API con validación de respuesta
export const safeApi = async (endpoint: string, init?: RequestInit) => {
  try {
    const res = await api(endpoint, init);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return safeJson(res);
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};
