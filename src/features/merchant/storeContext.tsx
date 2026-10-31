import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { api } from '../../lib/api';
import type { MerchantStore, StorePermission } from '../../lib/types';

interface StoreCtx {
  store: MerchantStore;
  can: (p: StorePermission) => boolean;
  permissions: StorePermission[];
}
const Ctx = createContext<StoreCtx>(null!);
/** Loja aberta no painel e o que o papel da pessoa permite nela */
export const useStore = () => useContext(Ctx);

export const storeKey = (id: string) => ['merchant', 'store', id] as const;
export const useMerchantStore = (id: string) => useQuery({ queryKey: storeKey(id), queryFn: () => api.get<MerchantStore>(`/merchant/stores/${id}`) });

export function StoreProvider({ store, permissions, children }: { store: MerchantStore; permissions: StorePermission[]; children: ReactNode }) {
  return <Ctx.Provider value={{ store, permissions, can: (p) => permissions.includes(p) }}>{children}</Ctx.Provider>;
}
