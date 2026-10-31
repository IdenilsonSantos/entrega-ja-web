import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, buttonClass, DescriptionList, Drawer, EmptyState, LoadMore, PageHeader, PageLoader, Segmented, Table, Td, Th, VirtualRows, VirtualScroller, cn, rowClass } from '../../ds';
import { api } from '../../lib/api';
import { dateTime, money, phoneLink } from '../../lib/format';
import { usePaged } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import type { Order, OrderStatus, Page } from '../../lib/types';
import { OrderAddress, OrderItems, OrderStatusBadge, OrderTimeline, OrderTotals, vehicleText } from '../shared/order';
import { useOrderActions } from './orderActions';
import { OrderTicket } from './OrderTicket';
import { useStore } from './storeContext';

const COLUMNS: { status: OrderStatus; title: string; short: string; empty: string }[] = [
  { status: 'PENDING', title: 'Novos', short: 'Novos', empty: 'Pedidos novos aparecem aqui com um aviso sonoro.' },
  { status: 'PREPARING', title: 'Em preparo', short: 'Preparo', empty: 'Nada na cozinha.' },
  { status: 'READY', title: 'Prontos', short: 'Prontos', empty: 'Marque como pronto para chamar o entregador.' },
  { status: 'PICKED_UP', title: 'Em entrega', short: 'Na rua', empty: 'Nenhum pedido na rua.' },
];

function OrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const actions = useOrderActions();
  const q = useQuery({ queryKey: ['order', id, 'store'], queryFn: () => api.get<Order>(`/merchant/orders/${id}`), enabled: !!id });
  const o = q.data;
  const act = async (fn: (o: Order) => Promise<unknown>) => {
    if (o && (await fn(o))) q.refetch();
  };
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={o ? `Pedido #${o.number}` : 'Pedido'}
      subtitle={o && <OrderStatusBadge status={o.status} />}
      footer={
        o && (
          <>
            {(o.status === 'PREPARING' || o.status === 'READY') && (
              <Button variant="outline" onClick={() => act(actions.cancel)}>
                Cancelar pedido
              </Button>
            )}
            {o.status === 'PENDING' && (
              <>
                <Button variant="outline" onClick={() => act(actions.reject)}>
                  Recusar
                </Button>
                <Button onClick={() => act(actions.accept)}>Aceitar pedido</Button>
              </>
            )}
            {o.status === 'PREPARING' && (
              <Button variant="dark" onClick={() => act(actions.ready)}>
                Marcar como pronto
              </Button>
            )}
          </>
        )
      }
    >
      {!o ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3">
            <h3>Cliente</h3>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink">{o.customer?.name}</span>
              {o.customer?.phone && (
                <a href={phoneLink(o.customer.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  <Phone size={15} /> {o.customer.phone}
                </a>
              )}
            </div>
            <OrderAddress order={o} />
          </section>
          <section className="grid gap-3">
            <h3>Itens</h3>
            <OrderItems items={o.items} />
            <div className="border-t border-line pt-3">
              <OrderTotals order={o} />
            </div>
            {o.platformFeeCents !== undefined && (
              <DescriptionList items={[{ label: 'Comissão da plataforma', value: money(o.platformFeeCents) }, { label: 'Você recebe', value: <strong>{money(o.subtotalCents - o.platformFeeCents)}</strong> }]} />
            )}
          </section>
          {o.courier && (
            <section className="grid gap-1">
              <h3>Entregador</h3>
              <span className="text-ink">{o.courier.name}</span>
              <span className="text-sm text-muted">{[vehicleText(o.courier.vehicle), o.courier.vehicle?.plate].filter(Boolean).join(', ')}</span>
            </section>
          )}
          {o.cancelReason && (
            <section className="grid gap-1">
              <h3>Motivo do cancelamento</h3>
              <p className="text-sm">{o.cancelReason}</p>
            </section>
          )}
          {o.timeline && (
            <section className="grid gap-3">
              <h3>Histórico</h3>
              <OrderTimeline events={o.timeline} />
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** Para onde cada cartão pode ser arrastado (o resto é com o entregador) */
const DROPS: Partial<Record<OrderStatus, OrderStatus[]>> = { PENDING: ['PREPARING', 'READY'], PREPARING: ['READY'] };

function Board({ open }: { open: (id: string) => void }) {
  const { store } = useStore();
  const now = useNow();
  const actions = useOrderActions();
  const [col, setCol] = useState<OrderStatus>('PENDING');
  const [dragging, setDragging] = useState<Order | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);
  const canDrop = (to: OrderStatus) => !!dragging && !!DROPS[dragging.status]?.includes(to);
  const drop = async (to: OrderStatus) => {
    const o = dragging;
    setDragging(null);
    setOver(null);
    if (!o || !DROPS[o.status]?.includes(to)) return;
    // de Novos direto para Prontos: aceita e marca pronto em sequência
    const accepted = o.status === 'PENDING' ? await actions.accept(o) : o;
    if (accepted && to === 'READY') await actions.ready(accepted);
  };
  const q = useQuery({ queryKey: ['merchant', store.id, 'orders', 'active'], queryFn: () => api.get<Page<Order>>(`/merchant/stores/${store.id}/orders?scope=active&limit=100`), refetchInterval: 60_000 });
  const byStatus = useMemo(() => {
    const m = new Map<OrderStatus, Order[]>(COLUMNS.map((c) => [c.status, []]));
    // mais antigos primeiro: quem espera há mais tempo fica no topo
    [...(q.data?.items ?? [])].reverse().forEach((o) => m.get(o.status)?.push(o));
    return m;
  }, [q.data]);
  if (q.isLoading) return <PageLoader />;

  return (
    <>
      <Segmented
        label="Etapa"
        className="mb-4 flex w-full lg:hidden"
        value={col}
        onChange={setCol}
        options={COLUMNS.map((c) => ({ value: c.status, label: <span className="whitespace-nowrap">{c.short} {byStatus.get(c.status)!.length > 0 && <b className="text-primary-text">{byStatus.get(c.status)!.length}</b>}</span> }))}
      />
      {(store.autoAccept || store.autoReady) && (
        <p className="mb-3 text-[13px] text-muted">
          Automação ligada: {[store.autoAccept && 'aceite automático', store.autoReady && `pronto após ${store.prepTimeMin} min`].filter(Boolean).join(' e ')}.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
        {COLUMNS.map((c) => {
          const list = byStatus.get(c.status)!;
          return (
            <section
              key={c.status}
              aria-label={c.title}
              onDragOver={(e) => {
                if (!canDrop(c.status)) return;
                e.preventDefault();
                setOver(c.status);
              }}
              onDragLeave={() => setOver((x) => (x === c.status ? null : x))}
              onDrop={(e) => {
                e.preventDefault();
                drop(c.status);
              }}
              className={cn(
                'grid min-h-40 gap-3 rounded-card transition lg:bg-hover/60 lg:p-3',
                col !== c.status && 'hidden lg:grid',
                dragging && !canDrop(c.status) && dragging.status !== c.status && 'opacity-45',
                canDrop(c.status) && 'outline-2 outline-dashed outline-primary/50',
                over === c.status && 'bg-primary-soft outline-primary',
              )}
            >
              <h2 className="hidden items-center justify-between px-1 text-base lg:flex">
                {c.title}
                <span className="text-sm text-muted tabular-nums">{list.length}</span>
              </h2>
              {list.length ? (
                // cada coluna rola sozinha e só desenha os pedidos perto da tela
                <VirtualScroller
                  items={list}
                  estimate={200}
                  gap={12}
                  className="-mx-1 max-h-[calc(100dvh-300px)] px-1 lg:max-h-[calc(100dvh-240px)]"
                  render={(o) => (
                  <div
                    draggable={!!DROPS[o.status]}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDragging(o);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    className={cn(DROPS[o.status] && 'lg:cursor-grab lg:active:cursor-grabbing', dragging?.id === o.id && 'opacity-40')}
                  >
                    <OrderTicket o={o} now={now} actions={actions} onOpen={() => open(o.id)} />
                  </div>
                  )}
                />
              ) : (
                <p className="px-1 py-6 text-sm text-muted">{over === c.status ? 'Solte aqui' : c.empty}</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function History({ open }: { open: (id: string) => void }) {
  const { store } = useStore();
  const list = usePaged<Order>(['merchant', store.id, 'orders', 'history'], `/merchant/stores/${store.id}/orders?scope=history`, { limit: 30 });
  if (list.loading) return <PageLoader />;
  if (!list.items.length) return <EmptyState icon={ClipboardList} title="Nenhum pedido finalizado ainda" />;
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Pedido</Th>
            <Th>Cliente</Th>
            <Th>Quando</Th>
            <Th>Situação</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <VirtualRows
          items={list.items}
          colSpan={5}
          onEnd={list.loadMore}
          row={(o, m) => (
            <tr key={o.id} {...m} className={rowClass} onClick={() => open(o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(o.id)}>
              <Td className="font-bold tabular-nums">#{o.number}</Td>
              <Td>{o.customer?.name}</Td>
              <Td className="text-muted">{dateTime(o.createdAt)}</Td>
              <Td>
                <OrderStatusBadge status={o.status} />
              </Td>
              <Td className="text-right tabular-nums">{money(o.totalCents)}</Td>
            </tr>
          )}
        />
      </Table>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="pedidos" />
    </>
  );
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'now' | 'done'>('now');
  const openId = params.get('id');
  const open = (id: string) => setParams({ id });
  return (
    <>
      <PageHeader title="Pedidos" actions={<Segmented label="Mostrar" value={view} onChange={setView} options={[{ value: 'now', label: 'Em andamento' }, { value: 'done', label: 'Finalizados' }]} />} />
      {view === 'now' ? <Board open={open} /> : <History open={open} />}
      <OrderDrawer id={openId} onClose={() => setParams({})} />
    </>
  );
}

