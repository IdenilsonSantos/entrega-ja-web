/**
 * Cliente HTTP da API. Guarda o token, transforma erros em ApiError com a mensagem
 * pronta para a tela e avisa o app quando a sessão expira.
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Fotos chegam como "/api/uploads/x.webp"; com a API em outro domínio, o caminho aponta para ela */
export const assetUrl = (url?: string | null) =>
  !url ? undefined : url.startsWith('/api/') && /^https?:\/\//.test(API_BASE) ? API_BASE.replace(/\/api$/, '') + url : url;

const TOKEN_KEY = 'ej.token';
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* navegação privada */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: { ...(!isForm && body !== undefined && { 'content-type': 'application/json' }), ...(token && { authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Confira sua internet');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new ApiError(res.status, msg || 'Algo deu errado. Tente de novo');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  upload: <T>(path: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<T>('POST', path, fd);
  },
};

/** Monta a query string ignorando vazios: qs({ q: '', status: 'OPEN' }) → "?status=OPEN" */
export const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][]).toString();
  return s ? `?${s}` : '';
};
