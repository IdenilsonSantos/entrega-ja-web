import { InfiniteData, QueryClient, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Page } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Lista paginada por cursor (contrato { items, nextCursor } da API).
 * Devolve os itens já achatados e loadMore para a rolagem infinita.
 */
export function usePaged<T extends { id: string }>(key: QueryKey, path: string, opts: { limit?: number; enabled?: boolean } = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const q = useInfiniteQuery({
    queryKey: key,
    enabled: opts.enabled ?? true,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.get<Page<T>>(`${path}${sep}limit=${opts.limit ?? 20}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return {
    items,
    loading: q.isLoading,
    error: q.error as ApiError | null,
    hasMore: !!q.hasNextPage,
    loadingMore: q.isFetchingNextPage,
    loadMore: () => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage(),
    refetch: q.refetch,
  };
}

/** Atualiza um item (pelo id) em todas as listas paginadas e detalhes do cache */
export function patchEverywhere<T extends { id: string }>(item: T, match: (key: QueryKey) => boolean) {
  queryClient.getQueriesData<InfiniteData<Page<T>> | T>({ predicate: (q) => match(q.queryKey) }).forEach(([key, data]) => {
    if (!data) return;
    if ('pages' in (data as object)) {
      const inf = data as InfiniteData<Page<T>>;
      if (!inf.pages.some((p) => p.items.some((i) => i.id === item.id))) return;
      queryClient.setQueryData(key, { ...inf, pages: inf.pages.map((p) => ({ ...p, items: p.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)) })) });
    } else if ((data as T).id === item.id) {
      queryClient.setQueryData(key, { ...(data as T), ...item });
    }
  });
}
