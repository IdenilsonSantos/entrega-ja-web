import { useQuery } from '@tanstack/react-query';
import { ChevronRight, SearchX, Store as StoreIcon } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, EmptyState, SearchInput, Skeleton, VirtualList } from '../../ds';
import { api, qs } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { chunk, useMedia } from '../../lib/useMedia';
import { ORDER_STATUS } from '../../lib/format';
import type { Order, Page, Store } from '../../lib/types';
import { useDelivery } from './location';
import { StoreRow } from './StoreRow';

/** Pedido em andamento fixo no topo: o mais importante para quem já pediu */
function ActiveOrders() {
  const { me } = useAuth();
  const q = useQuery({ queryKey: ['orders', 'active'], queryFn: () => api.get<Page<Order>>('/orders?scope=active&limit=5'), enabled: me?.role === 'CUSTOMER', refetchInterval: 60_000 });
  const orders = q.data?.items ?? [];
  if (!orders.length) return null;
  return (
    <div className="mb-6 grid gap-2">
      {orders.map((o) => (
        <Link key={o.id} to={`/pedidos/${o.id}`} className="flex items-center gap-4 rounded-card bg-navy px-5 py-4 text-white no-underline">
          <span className="grid min-w-0 flex-1">
            <span className="text-[13px] text-white/70">{o.store.name}</span>
            <strong className="text-base">{ORDER_STATUS[o.status].customer}</strong>
          </span>
          <span className="text-sm font-bold text-primary">Acompanhar</span>
          <ChevronRight size={18} aria-hidden />
        </Link>
      ))}
    </div>
  );
}

type Row = { id: string; title: string; muted?: boolean } | { id: string; items: Store[] };

/** Lojas abertas e fechadas numa lista só, virtualizada, com uma ou duas lojas por linha */
function StoreList({ open, closed }: { open: Store[]; closed: Store[] }) {
  // duas lojas por linha a partir de 640px (sm), uma no celular
  const cols = useMedia('(min-width: 640px)') ? 2 : 1;
  const rows = useMemo<Row[]>(
    () => [
      { id: 'h-open', title: open.length ? `${open.length} ${open.length === 1 ? 'loja aberta' : 'lojas abertas'}` : 'Todas fechadas agora' },
      ...chunk(open, cols),
      ...(closed.length ? [{ id: 'h-closed', title: 'Fechadas agora', muted: true }, ...chunk(closed, cols)] : []),
    ],
    [open, closed, cols],
  );
  return (
    <VirtualList
      items={rows}
      estimate={92}
      render={(r) =>
        'items' in r ? (
          <div className="grid gap-x-6 pb-1 sm:grid-cols-2">
            {r.items.map((s) => (
              <StoreRow key={s.id} store={s} />
            ))}
          </div>
        ) : (
          <h2 className={r.muted ? 'mt-6 mb-2 text-lg text-muted' : 'mb-2 text-lg'}>{r.title}</h2>
        )
      }
    />
  );
}

export function HomePage() {
  const { me } = useAuth();
  const { place } = useDelivery();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const search = useDeferredValue(q.trim());
  // categorias saem das lojas que entregam neste endereço: nenhuma aba leva a uma lista vazia
  const nearby = useQuery({ queryKey: ['stores', place.lat, place.lng, '', null], queryFn: () => api.get<Store[]>(`/stores${qs({ lat: place.lat, lng: place.lng })}`) });
  const cats = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of nearby.data ?? []) count.set(s.category, (count.get(s.category) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([category]) => category);
  }, [nearby.data]);
  // categoria escolhida que não existe no endereço novo: volta para "Tudo"
  useEffect(() => {
    if (category && nearby.data && !cats.includes(category)) setCategory(null);
  }, [cats, category, nearby.data]);
  const stores = useQuery({
    queryKey: ['stores', place.lat, place.lng, search, category],
    queryFn: () => api.get<Store[]>(`/stores${qs({ lat: place.lat, lng: place.lng, q: search.length >= 2 ? search : undefined, category })}`),
    placeholderData: (prev) => prev,
  });
  const list = stores.data ?? [];
  const open = list.filter((s) => s.isOpen);
  const closed = list.filter((s) => !s.isOpen);

  return (
    <>
      <ActiveOrders />
      <h1 className="mb-1 text-[28px]">{me ? `O que vai ser hoje, ${me.name.split(' ')[0]}?` : 'Peça das lojas do seu bairro'}</h1>
      <p className="mb-5 text-muted">Só aparecem as lojas que entregam em {place.address?.street ?? place.label}.</p>
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar loja ou prato" aria-label="Buscar loja ou prato" className="mb-4 max-w-xl" />
      {cats.length > 1 && (
        <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip active={!category} onClick={() => setCategory(null)}>
            Tudo
          </Chip>
          {cats.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {stores.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : !list.length ? (
        <EmptyState
          icon={search ? SearchX : StoreIcon}
          title={search ? `Nada encontrado para "${search}"` : 'Nenhuma loja entrega aqui ainda'}
          description={search ? 'Tente outro nome de prato ou de loja.' : 'Troque o endereço de entrega no topo da página.'}
        />
      ) : (
        <StoreList open={open} closed={closed} />
      )}
    </>
  );
}
