import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useToast } from '../../ds';
import { api } from '../../lib/api';
import { DEMO_TOOLS } from '../../lib/env';
import { queryClient } from '../../lib/query';
import { beep, useRealtime } from '../../lib/realtime';
import type { Offer, Order } from '../../lib/types';

export interface CourierStatus {
  approved: boolean;
  online: boolean;
  wantsOnline: boolean;
  offer: Offer | null;
  active: Order[];
}

interface Shift {
  status: CourierStatus | undefined;
  online: boolean;
  toggling: boolean;
  position: { lat: number; lng: number } | null;
  setOnline: (on: boolean) => Promise<void>;
  /** só nas ferramentas de teste: posição vinda do simulador em vez do GPS */
  simulate: ((p: { lat: number; lng: number }) => void) | null;
  simulating: boolean;
  setSimulating: (v: boolean) => void;
}

const Ctx = createContext<Shift>(null!);
export const useShift = () => useContext(Ctx);
export const STATUS_KEY = ['courier', 'status'];

const SEND_EVERY_MS = 8000;

/**
 * Turno do entregador, ativo em todas as telas da área:
 * - o "online" fica salvo na conta: se ele estava online, ao abrir o app liga sozinho;
 * - enquanto online, manda a posição do GPS a cada poucos segundos (a API também o
 *   recoloca online se a presença tiver expirado por falta de sinal);
 * - ofertas chegam pelo tempo real e tocam um bip.
 */
export function ShiftProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const status = useQuery({ queryKey: STATUS_KEY, queryFn: () => api.get<CourierStatus>('/courier/status'), refetchInterval: 60_000 });
  const [online, setOnlineState] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const last = useRef(0);
  const autoTried = useRef(false);

  useEffect(() => {
    if (status.data) setOnlineState(status.data.online);
  }, [status.data?.online]); // eslint-disable-line react-hooks/exhaustive-deps

  const readGps = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => reject(new Error('Ative a localização para ficar online')), { enableHighAccuracy: true, timeout: 10000 })
        : reject(new Error('Este aparelho não informa a localização')),
    );

  const setOnline = useCallback(
    async (on: boolean) => {
      setToggling(true);
      try {
        if (on) {
          const p = position ?? (await readGps());
          await api.post('/courier/presence', { online: true, ...p });
          setPosition(p);
        } else {
          await api.post('/courier/presence', { online: false });
        }
        setOnlineState(on);
        queryClient.invalidateQueries({ queryKey: STATUS_KEY });
      } catch (e) {
        toast.error(on ? 'Não foi possível ficar online' : 'Não foi possível ficar offline', (e as Error).message);
      } finally {
        setToggling(false);
      }
    },
    [position, toast],
  );

  // estava online da última vez: liga sozinho ao abrir
  useEffect(() => {
    const s = status.data;
    if (!s || autoTried.current) return;
    autoTried.current = true;
    if (s.approved && s.wantsOnline && !s.online) setOnline(true);
  }, [status.data, setOnline]);

  const send = useCallback(async (p: { lat: number; lng: number }, force = false) => {
    setPosition(p);
    if (!force && Date.now() - last.current < SEND_EVERY_MS) return;
    last.current = Date.now();
    const r = await api.post<{ online: boolean }>('/courier/location', p).catch(() => null);
    if (r && !r.online) setOnlineState(false);
  }, []);

  // GPS enquanto online (o simulador, quando ligado, assume o lugar do GPS)
  useEffect(() => {
    if (!online || simulating || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => send({ lat: p.coords.latitude, lng: p.coords.longitude }), () => undefined, { enableHighAccuracy: true, maximumAge: 5000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [online, simulating, send]);

  useRealtime('offer.new', (offer: Offer) => {
    beep();
    queryClient.setQueryData<CourierStatus>(STATUS_KEY, (s) => s && { ...s, offer });
  });
  const clearOffer = (d: { orderId: string }) => queryClient.setQueryData<CourierStatus>(STATUS_KEY, (s) => (s && s.offer?.orderId === d.orderId ? { ...s, offer: null } : s));
  useRealtime('offer.expired', clearOffer);
  useRealtime('offer.cancelled', clearOffer);
  useRealtime('order.updated', () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }));
  useRealtime('notification', (n: { type: string }) => n.type.startsWith('account') && queryClient.invalidateQueries({ queryKey: ['me'] }));

  return (
    <Ctx.Provider
      value={{
        status: status.data,
        online,
        toggling,
        position,
        setOnline,
        simulate: DEMO_TOOLS ? (p) => send(p, true) : null,
        simulating,
        setSimulating,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
