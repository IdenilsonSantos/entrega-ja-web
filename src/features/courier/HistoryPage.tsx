import { History } from 'lucide-react';
import { EmptyState, LoadMore, PageHeader, PageLoader, VirtualList } from '../../ds';
import { dateTime, km, money } from '../../lib/format';
import { usePaged } from '../../lib/query';
import type { Order } from '../../lib/types';
import { OrderStatusBadge } from '../shared/order';

export function HistoryPage() {
  const list = usePaged<Order>(['courier', 'orders', 'history'], '/courier/deliveries', { limit: 20 });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Histórico" />
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={History} title="Nenhuma entrega ainda" description="As corridas concluídas aparecem aqui com o valor de cada uma." />
      ) : (
        <>
          <VirtualList
            items={list.items}
            estimate={78}
            onEnd={list.loadMore}
            render={(o) => (
              <div className="flex items-center gap-4 border-b border-line py-3.5">
                <div className="grid min-w-0 flex-1">
                  <strong className="truncate text-ink">
                    #{o.number} {o.store.name}
                  </strong>
                  <span className="truncate text-[13px] text-muted">
                    {dateTime(o.deliveredAt ?? o.createdAt)}, {km(o.distanceKm)}, {o.deliveryAddress}
                  </span>
                </div>
                {o.status === 'DELIVERED' ? <strong className="text-ink tabular-nums">{money(o.courierFeeCents ?? 0)}</strong> : <OrderStatusBadge status={o.status} />}
              </div>
            )}
          />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="entregas" />
        </>
      )}
    </div>
  );
}
