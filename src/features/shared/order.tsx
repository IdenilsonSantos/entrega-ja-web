import { Check, ChefHat, Clock, PackageCheck, Store, Truck, type LucideIcon } from 'lucide-react';
import { Badge, cn, DescriptionList } from '../../ds';
import { dateTime, money, ORDER_STATUS, PAYMENT, time, VEHICLE } from '../../lib/format';
import type { CourierInfo, Order, OrderItem, OrderStatus } from '../../lib/types';

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}

const STEPS: { status: OrderStatus; label: string; icon: LucideIcon }[] = [
  { status: 'PENDING', label: 'Recebido', icon: Clock },
  { status: 'PREPARING', label: 'Em preparo', icon: ChefHat },
  { status: 'READY', label: 'Pronto', icon: Store },
  { status: 'PICKED_UP', label: 'A caminho', icon: Truck },
  { status: 'DELIVERED', label: 'Entregue', icon: PackageCheck },
];

/** Etapas do pedido em linha, com a atual destacada */
export function OrderSteps({ status }: { status: OrderStatus }) {
  const idx = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Etapas do pedido">
      {STEPS.map((s, i) => {
        const done = i < idx || status === 'DELIVERED';
        const current = i === idx && status !== 'DELIVERED';
        return (
          <li key={s.status} className="grid justify-items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
            <span className={cn('relative grid size-10 place-items-center rounded-full transition', done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-field text-subtle')}>
              {done ? <Check size={18} /> : <s.icon size={18} />}
            </span>
            <span className={cn('text-[11px] leading-tight font-bold', current ? 'text-ink' : 'text-muted')}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ items, prices = true }: { items: OrderItem[]; prices?: boolean }) {
  return (
    <ul className="grid gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="grid h-7 min-w-7 place-items-center rounded-sm bg-field px-1.5 font-bold text-ink">{it.qty}×</span>
          <div className="min-w-0 flex-1">
            <strong className="text-ink">{it.name}</strong>
            {it.options.length > 0 && <p className="text-[13px] text-muted">{it.options.map((o) => o.name).join(', ')}</p>}
            {it.notes && <p className="text-[13px] text-warn">Obs.: {it.notes}</p>}
          </div>
          {prices && <span className="shrink-0 text-ink tabular-nums">{money(it.totalCents)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Pick<Order, 'subtotalCents' | 'deliveryFeeCents' | 'totalCents' | 'paymentMethod' | 'changeForCents'> }) {
  return (
    <div className="grid gap-1.5 text-sm">
      <div className="flex justify-between text-muted">
        <span>Subtotal</span>
        <span className="tabular-nums">{money(order.subtotalCents)}</span>
      </div>
      <div className="flex justify-between text-muted">
        <span>Entrega</span>
        <span className="tabular-nums">{money(order.deliveryFeeCents)}</span>
      </div>
      <div className="flex justify-between text-base font-bold text-ink">
        <span>Total</span>
        <span className="tabular-nums">{money(order.totalCents)}</span>
      </div>
      <p className="text-[13px] text-muted">
        {PAYMENT[order.paymentMethod]}
        {order.changeForCents ? `, troco para ${money(order.changeForCents)}` : ''}
      </p>
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: 'Pedido feito',
  accepted: 'Loja aceitou',
  rejected: 'Loja recusou',
  ready: 'Pronto para retirada',
  assigned: 'Entregador aceitou',
  'assigned.manual': 'Entregador designado pela plataforma',
  unassigned: 'Entregador removido',
  dropped: 'Entregador desistiu',
  picked_up: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function OrderTimeline({ events }: { events: NonNullable<Order['timeline']> }) {
  return (
    <ol className="relative grid gap-4 border-l-2 border-line pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative grid text-sm">
          <span className={cn('absolute top-1 -left-[27px] size-3 rounded-full ring-4 ring-surface', i === events.length - 1 ? 'bg-primary' : 'bg-subtle')} aria-hidden />
          <span className="flex justify-between gap-2">
            <strong className="text-ink">{EVENT_LABEL[e.type] ?? e.type}</strong>
            <span className="text-muted tabular-nums">{time(e.at)}</span>
          </span>
          {e.note && <span className="text-[13px] text-muted">{e.note}</span>}
        </li>
      ))}
    </ol>
  );
}

export const vehicleText = (v: CourierInfo['vehicle']) => (v ? [VEHICLE[v.type], v.model, v.color].filter(Boolean).join(', ') : null);

export function OrderAddress({ order }: { order: Order }) {
  return (
    <DescriptionList
      items={[
        { label: 'Entregar em', value: [order.deliveryAddress, order.deliveryComplement].filter(Boolean).join(' – ') },
        ...(order.deliveryReference ? [{ label: 'Referência', value: order.deliveryReference }] : []),
        ...(order.notes ? [{ label: 'Observação', value: order.notes }] : []),
        { label: 'Feito em', value: dateTime(order.createdAt) },
      ]}
    />
  );
}
