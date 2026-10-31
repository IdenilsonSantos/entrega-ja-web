import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';
import type { InfiniteData } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ds';
import { API_BASE, tokenStore } from './api';
import { useAuth } from './auth';
import { patchEverywhere, queryClient } from './query';
import type { Notification, Order, Page } from './types';

/**
 * Tempo real: uma conexão SSE por aba, enquanto houver login.
 * - notificação nova entra na central, aumenta o contador e aparece como aviso na tela;
 * - pedido alterado é atualizado em todas as listas e detalhes abertos;
 * - outros eventos (ofertas, posição do entregador, frota) vão para quem assinou com useRealtime().
 * Em queda de conexão, reconecta sozinho e a API reenvia o que se perdeu (Last-Event-ID).
 */
type Handler = (data: any) => void;
const Ctx = createContext<{ on: (event: string, fn: Handler) => () => void }>({ on: () => () => {} });

export function useRealtime(event: string, fn: Handler) {
  const { on } = useContext(Ctx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => on(event, (d) => ref.current(d)), [on, event]);
}

/** Bip curto (ofertas e pedidos novos), sem arquivo de áudio */
export function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {
    /* sem áudio */
  }
}
const LOUD = ['offer.new', 'order.new', 'order.assigned', 'dispatch.stuck'];

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const listeners = useRef(new Map<string, Set<Handler>>());
  const on = useRef((event: string, fn: Handler) => {
    const set = listeners.current.get(event) ?? new Set();
    set.add(fn);
    listeners.current.set(event, set);
    return () => void set.delete(fn);
  }).current;

  useEffect(() => {
    if (!me) return;
    const ctrl = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshLists = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('orders') || q.queryKey.includes('stats') || q.queryKey.includes('overview') }), 400);
    };

    const handle = (event: string, data: any) => {
      if (event === 'notification') {
        const n = data as Notification;
        queryClient.setQueryData<InfiniteData<Page<Notification>>>(['notifications'], (old) => (old ? { ...old, pages: [{ ...old.pages[0], items: [n, ...old.pages[0].items.filter((x) => x.id !== n.id)] }, ...old.pages.slice(1)] } : old));
        queryClient.setQueryData<{ unread: number }>(['unread'], (old) => ({ unread: (old?.unread ?? 0) + 1 }));
        if (LOUD.includes(n.type)) beep();
        if (n.type !== 'offer.new') toast.show({ tone: 'info', title: n.title, body: n.body, onClick: n.link ? () => navigate(n.link!) : undefined });
      } else if (event === 'notification.read') {
        queryClient.setQueryData(['unread'], { unread: data.unread });
      } else if (event === 'order.updated') {
        const o = data as Order;
        patchEverywhere(o, (k) => k.includes('orders') || (k[0] === 'order' && k[1] === o.id) || k.includes('courier'));
        refreshLists();
      } else if (event === 'session.revoked') {
        signOut();
      }
      listeners.current.get(event)?.forEach((fn) => fn(data));
    };

    fetchEventSource(`${API_BASE}/events/stream`, {
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${tokenStore.get()}` },
      openWhenHidden: true,
      async onopen(res) {
        if (res.ok && res.headers.get('content-type')?.startsWith(EventStreamContentType)) return;
        if (res.status === 401 || res.status === 403) throw new Error('fatal');
      },
      onmessage(msg) {
        if (!msg.event || msg.event === 'ready') return;
        try {
          handle(msg.event, JSON.parse(msg.data));
        } catch {
          /* evento malformado */
        }
      },
      onerror(err) {
        if ((err as Error)?.message === 'fatal') throw err;
        return 3000; // tenta de novo em 3s
      },
    }).catch(() => undefined);

    // clique numa notificação do sistema com o site aberto
    const onSw = (e: MessageEvent) => e.data?.type === 'navigate' && navigate(e.data.link);
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => {
      ctrl.abort();
      clearTimeout(refreshTimer);
      navigator.serviceWorker?.removeEventListener('message', onSw);
    };
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ on }}>{children}</Ctx.Provider>;
}
