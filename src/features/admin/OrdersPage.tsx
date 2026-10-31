import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Phone, UserMinus, UserPlus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, buttonClass, DescriptionList, Drawer, EmptyState, Input, LoadMore, PageHeader, PageLoader, Segmented, Select, Table, Td, Th, VirtualRows, rowClass } from '../../ds';
import { api, qs } from '../../lib/api';
import { dateTime, money, ORDER_STATUS, phoneLink } from '../../lib/format';
import { usePaged } from '../../lib/query';
import { useRealtime } from '../../lib/realtime';
import type { OrderStatus } from '../../lib/types';
import { OrderAddress, OrderItems, OrderStatusBadge, OrderTimeline, OrderTotals, vehicleText } from '../shared/order';
import { AssignCourierDialog } from './AssignCourierDialog';
import type { AdminOrder } from './types';
import { useAdminAction } from './useAdminAction';

export function AdminOrderDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const act = useAdminAction();
  const [assigning, setAssigning] = useState(false);
  const q = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => api.get<AdminOrder>(`/admin/orders/${id}`), enabled: !!id });
  useRealtime('order.updated', (o: AdminOrder) => o.id === id && q.refetch());
  const o = q.data;
  const canAssign = o && (o.status === 'PREPARING' || o.status === 'READY');
  const active = o && ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'].includes(o.status);
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width={560}
      title={o ? `Pedido #${o.number}` : 'Pedido'}
      subtitle={o && <OrderStatusBadge status={o.status} />}
      footer={
        o &&
        active && (
          <>
            <Button
              variant="danger"
              icon={XCircle}
              onClick={() => act({ path: `/admin/orders/${o.id}/cancel`, title: `Cancelar o pedido #${o.number}?`, description: 'Cliente, loja e entregador são avisados com o motivo.', reason: 'Motivo', confirmLabel: 'Cancelar pedido', done: 'Pedido cancelado', danger: true }).then((ok) => void (ok && q.refetch()))}
            >
              Cancelar
            </Button>
            {canAssign && o.courier && o.status === 'READY' && (
              <Button variant="outline" icon={UserMinus} onClick={() => act({ path: `/admin/orders/${o.id}/unassign`, title: `Tirar ${o.courier!.name} do pedido?`, description: 'O pedido volta para a busca automática.', confirmLabel: 'Tirar entregador', done: 'Entregador removido' }).then((ok) => void (ok && q.refetch()))}>
                Tirar entregador
              </Button>
            )}
            {canAssign && (
              <Button icon={UserPlus} onClick={() => setAssigning(true)}>
                {o.courier ? 'Trocar entregador' : 'Atribuir entregador'}
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
          {o.status === 'READY' && !o.courier && <Alert tone="warn" title="Sem entregador">A busca automática continua. Se estiver demorando, atribua alguém.</Alert>}
          <DescriptionList
            items={[
              { label: 'Loja', value: <Link to={`/admin/lojas?id=${o.store.id}`}>{o.store.name}</Link> },
              { label: 'Cliente', value: <Link to={`/admin/contas?id=${o.customer?.id}`}>{o.customer?.name}</Link> },
              { label: 'Entregador', value: o.courier ? <Link to={`/admin/contas?id=${o.courier.id}`}>{o.courier.name}</Link> : '—' },
              ...(o.courier ? [{ label: 'Veículo', value: [vehicleText(o.courier.vehicle), o.courier.vehicle?.plate].filter(Boolean).join(', ') }] : []),
              { label: 'Código de entrega', value: <span className="font-bold tabular-nums">{o.deliveryCode}</span> },
              { label: 'Entregador recebe', value: money(o.courierFeeCents ?? 0) },
              { label: 'Comissão', value: money(o.platformFeeCents ?? 0) },
            ]}
          />
          {(o.customer?.phone || o.courier?.phone) && (
            <div className="flex flex-wrap gap-2">
              {o.customer?.phone && (
                <a href={phoneLink(o.customer.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  <Phone size={15} /> Cliente
                </a>
              )}
              {o.courier?.phone && (
                <a href={phoneLink(o.courier.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  <Phone size={15} /> Entregador
                </a>
              )}
            </div>
          )}
          <OrderAddress order={o} />
          <section className="grid gap-3">
            <h3>Itens</h3>
            <OrderItems items={o.items} />
            <div className="border-t border-line pt-3">
              <OrderTotals order={o} />
            </div>
          </section>
          {o.cancelReason && <Alert tone="neutral" title="Motivo do cancelamento">{o.cancelReason}</Alert>}
          {o.timeline && (
            <section className="grid gap-3">
              <h3>Histórico</h3>
              <OrderTimeline events={o.timeline} />
            </section>
          )}
        </div>
      )}
      {o && <AssignCourierDialog order={o} open={assigning} onClose={() => (setAssigning(false), q.refetch())} />}
    </Drawer>
  );
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState<'active' | 'history'>('active');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [number, setNumber] = useState('');
  const path = `/admin/orders${qs({ scope, status, number: /^\d+$/.test(number) ? number : undefined })}`;
  const list = usePaged<AdminOrder>(['admin', 'orders', path], path, { limit: 40 });
  const open = (id: string) => setParams({ id });
  const statuses = (scope === 'active' ? ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'] : ['DELIVERED', 'REJECTED', 'CANCELLED']) as OrderStatus[];
  return (
    <>
      <PageHeader title="Pedidos" description="Todos os pedidos da plataforma" actions={<Segmented label="Mostrar" value={scope} onChange={(v) => (setScope(v), setStatus(''))} options={[{ value: 'active', label: 'Em andamento' }, { value: 'history', label: 'Finalizados' }]} />} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="h-11 w-auto min-w-48">
          <option value="">Todas as situações</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS[s].label}
            </option>
          ))}
        </Select>
        <Input aria-label="Número do pedido" placeholder="Nº do pedido" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} className="h-11 w-40" />
      </div>
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={ClipboardList} title="Nenhum pedido aqui" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Pedido</Th>
                <Th>Loja</Th>
                <Th>Cliente</Th>
                <Th>Entregador</Th>
                <Th>Situação</Th>
                <Th>Feito em</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <VirtualRows
              items={list.items}
              colSpan={7}
              onEnd={list.loadMore}
              row={(o, m) => (
                <tr key={o.id} {...m} className={rowClass} tabIndex={0} onClick={() => open(o.id)} onKeyDown={(e) => e.key === 'Enter' && open(o.id)}>
                  <Td className="font-bold tabular-nums">#{o.number}</Td>
                  <Td>{o.store.name}</Td>
                  <Td>{o.customer?.name}</Td>
                  <Td className={o.status === 'READY' && !o.courier ? 'font-bold text-warn' : ''}>{o.courier?.name ?? (o.status === 'READY' ? 'Procurando' : '—')}</Td>
                  <Td>
                    <OrderStatusBadge status={o.status} />
                  </Td>
                  <Td className="text-muted">{dateTime(o.createdAt)}</Td>
                  <Td className="text-right tabular-nums">{money(o.totalCents)}</Td>
                </tr>
              )}
            />
          </Table>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="pedidos" />
        </>
      )}
      <AdminOrderDrawer id={params.get('id')} onClose={() => setParams({})} />
    </>
  );
}
