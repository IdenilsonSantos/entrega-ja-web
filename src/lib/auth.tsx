import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import { queryClient } from './query';
import type { Me, Role, Session } from './types';

interface AuthState {
  me: Me | null;
  loading: boolean;
  signIn: (s: Session) => Promise<Me>;
  signOut: () => void;
  refresh: () => Promise<unknown>;
}

const Ctx = createContext<AuthState>(null!);
export const useAuth = () => useContext(Ctx);

/** Para onde cada perfil vai depois de entrar */
export const HOME: Record<Role, string> = { CUSTOMER: '/', MERCHANT: '/loja', COURIER: '/entregador', ADMIN: '/admin' };

export function AuthProvider({ children }: { children: ReactNode }) {
  // estado (e não leitura do localStorage a cada render): entrar sem recarregar a página precisa re-renderizar
  const [hasToken, setHasToken] = useState(() => !!tokenStore.get());
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/me'), enabled: hasToken, staleTime: 60_000 });

  const signOut = useCallback(() => {
    tokenStore.set(null);
    queryClient.clear();
    queryClient.setQueryData(['me'], null);
    window.location.assign('/entrar');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  const signIn = useCallback(async (s: Session) => {
    tokenStore.set(s.token);
    const fresh = await api.get<Me>('/me');
    // tira os dados de uma sessão anterior, mas grava a conta antes de liberar as rotas protegidas
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    queryClient.setQueryData(['me'], fresh);
    setHasToken(true);
    return fresh;
  }, []);

  const value = useMemo<AuthState>(
    () => ({ me: hasToken ? (me.data ?? null) : null, loading: hasToken && me.isLoading, signIn, signOut, refresh: () => queryClient.invalidateQueries({ queryKey: ['me'] }) }),
    [hasToken, me.data, me.isLoading, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
