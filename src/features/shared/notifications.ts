import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { queryClient } from '../../lib/query';

/** Contador do sininho (o tempo real mantém atualizado) */
export function useUnread() {
  const { me } = useAuth();
  const q = useQuery({ queryKey: ['unread'], queryFn: () => api.get<{ unread: number }>('/notifications/unread-count'), enabled: !!me, staleTime: 60_000 });
  return q.data?.unread ?? 0;
}

export async function markRead(ids?: string[]) {
  const r = await api.post<{ unread: number }>('/notifications/read', ids ? { ids } : {});
  queryClient.setQueryData(['unread'], r);
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}
