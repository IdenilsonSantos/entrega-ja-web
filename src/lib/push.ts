import { api } from './api';

/**
 * Notificações push do navegador.
 * Estados: 'unsupported' (navegador sem suporte ou fora de HTTPS), 'denied' (bloqueado nas
 * configurações do navegador), 'off' (permitido mas não inscrito) e 'on'.
 */
export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

const toKey = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Pede permissão, inscreve o navegador e envia a inscrição para a API */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;
  const { publicKey } = await api.get<{ publicKey: string }>('/push/vapid-key');
  let sub = await reg.pushManager.getSubscription();
  // chave do servidor mudou: refaz a inscrição
  if (sub && sub.options.applicationServerKey) {
    const current = btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (current !== publicKey) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
  await api.post('/push/subscriptions', sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.delete('/push/subscriptions', { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
  return 'off';
}

/** Ao abrir o site com permissão já dada, garante que a API tem a inscrição atual */
export async function syncPush() {
  if ((await pushState()) === 'on') await enablePush().catch(() => undefined);
}
