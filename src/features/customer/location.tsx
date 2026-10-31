import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DEFAULT_POINT } from '../../lib/geo';
import type { Address } from '../../lib/types';

/**
 * Para onde a cliente quer receber: um endereço salvo (padrão: o marcado como principal)
 * ou um ponto solto (localização do aparelho, ou o padrão para quem ainda não entrou).
 * A vitrine usa esse ponto para mostrar só as lojas que entregam ali.
 */
interface Place {
  address: Address | null;
  lat: number;
  lng: number;
  label: string;
}
interface LocationApi {
  place: Place;
  addresses: Address[];
  choose: (a: Address) => void;
  usePoint: (p: { lat: number; lng: number }, label: string) => void;
}
const Ctx = createContext<LocationApi>(null!);
export const useDelivery = () => useContext(Ctx);

const KEY = 'ej.place';

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const list = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses'), enabled: me?.role === 'CUSTOMER' });
  const addresses = list.data ?? [];
  const [chosen, setChosen] = useState<{ id?: string; lat: number; lng: number; label: string } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (chosen) localStorage.setItem(KEY, JSON.stringify(chosen));
    } catch {
      /* */
    }
  }, [chosen]);

  const value = useMemo<LocationApi>(() => {
    const saved = (chosen?.id && addresses.find((a) => a.id === chosen.id)) || (!chosen && addresses.find((a) => a.isDefault)) || null;
    const place: Place = saved
      ? { address: saved, lat: saved.lat, lng: saved.lng, label: saved.street }
      : chosen && !chosen.id
        ? { address: null, lat: chosen.lat, lng: chosen.lng, label: chosen.label }
        : { address: null, ...DEFAULT_POINT, label: 'Av. Paulista, São Paulo' };
    return {
      place,
      addresses,
      choose: (a) => setChosen({ id: a.id, lat: a.lat, lng: a.lng, label: a.street }),
      usePoint: (p, label) => setChosen({ ...p, label }),
    };
  }, [chosen, addresses]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
