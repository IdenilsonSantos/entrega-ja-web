import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonClass, EmptyState, LoadMore, PageHeader, Skeleton, Thumb, VirtualList } from '../../ds';
import { api } from '../../lib/api';
import { dateShort, money, ORDER_STATUS, plural } from '../../lib/format';
import { usePaged } from '../../lib/query';
import type { Order, Page } from '../../lib/types';
import { OrderStatusBadge } from '../shared/order';

function OrderRow({ o }: { o: Order }) {
  const items = o.items.reduce((s, i) => s + i.qty, 0);
  return (
    <Link to={`/pedidos/${o.id}`} className="flex items-center gap-4 border-b border-line py-4 text-inherit no-underline">
      <Thumb src={o.store.logoUrl} name={o.store.name} className="size-14" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <strong className="truncate text-ink">{o.store.name}</strong>
        <span className="text-[13px] text-muted">
          {dateShort(o.createdAt)}, {plural(items, 'item', 'itens')}, {money(o.totalCents)}
        </span>
      </div>
      <OrderStatusBadge status={o.status} />
    </Link>
  );
}

export function OrdersPage() {
  const active = useQuery({ queryKey: ['orders', 'active'], queryFn: () => api.get<Page<Order>>('/orders?scope=active&limit=20') });
  const history = usePaged<Order>(['orders', 'history'], '/orders?scope=history', { limit: 20 });
  const now = active.data?.items ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pedidos" />
      {now.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-lg">Em andamento</h2>
          {now.map((o) => (
            <Link key={o.id} to={`/pedidos/${o.id}`} className="flex items-center gap-4 border-b border-line py-4 text-inherit no-underline">
              <Thumb src={o.store.logoUrl} name={o.store.name} className="size-14" />
              <div className="grid min-w-0 flex-1">
                <strong className="text-ink">{o.store.name}</strong>
                <span className="text-sm text-primary-text">{ORDER_STATUS[o.status].customer}</span>
              </div>
              <span className="text-sm font-bold text-primary-text">Acompanhar</span>
            </Link>
          ))}
        </section>
      )}
      <h2 className="mb-1 text-lg">Anteriores</h2>
      {history.loading ? (
        <div className="grid gap-3 pt-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !history.items.length && !now.length ? (
        <EmptyState icon={Receipt} title="Você ainda não fez pedidos" action={<Link to="/" className={buttonClass()}>Ver lojas</Link>} />
      ) : (
        <>
          <VirtualList items={history.items} estimate={89} onEnd={history.loadMore} render={(o) => <OrderRow o={o} />} />
          <LoadMore hasMore={history.hasMore} loading={history.loadingMore} onClick={history.loadMore} total={history.items.length} noun="pedidos" />
        </>
      )}
    </div>
  );
}
