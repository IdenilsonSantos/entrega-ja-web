import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Card, PageHeader, PageLoader, Stat, cn } from '../../ds';
import { api } from '../../lib/api';
import { money, ORDER_STATUS, plural } from '../../lib/format';
import { useRealtime } from '../../lib/realtime';
import type { OrderStatus } from '../../lib/types';
import { DeliveryMap, type MapPoint } from '../shared/DeliveryMap';
import type { Overview } from './types';

interface Fleet {
  couriers: { courierId: string; name: string; lat: number; lng: number; busy: boolean }[];
  orders: { id: string; number: number; status: OrderStatus; courierId: string | null; store: { name: string; lat: number; lng: number }; deliveryLat: number; deliveryLng: number }[];
}

/** Mapa ao vivo: entregadores (livres em laranja, em entrega em azul) e lojas com pedido pronto */
export function FleetMap({ className }: { className?: string }) {
  const q = useQuery({ queryKey: ['admin', 'fleet'], queryFn: () => api.get<Fleet>('/admin/fleet'), refetchInterval: 30_000 });
  const [live, setLive] = useState<Record<string, { lat: number; lng: number; name?: string; busy?: boolean; online: boolean }>>({});
  useRealtime('fleet.location', (d: { courierId: string; lat?: number; lng?: number; name?: string; busy?: boolean; online: boolean }) =>
    setLive((m) => ({ ...m, [d.courierId]: { ...m[d.courierId], ...d, lat: d.lat ?? m[d.courierId]?.lat, lng: d.lng ?? m[d.courierId]?.lng } as never })),
  );
  if (!q.data) return <div className={cn('animate-shimmer bg-shimmer rounded-card', className)} />;
  const couriers = new Map(q.data.couriers.map((c) => [c.courierId, { ...c, online: true }]));
  Object.entries(live).forEach(([id, v]) => couriers.set(id, { ...couriers.get(id), ...v, courierId: id } as never));
  const points: MapPoint[] = [
    ...[...couriers.values()].filter((c) => c.online && c.lat !== undefined).map((c) => ({ id: `c-${c.courierId}`, lat: c.lat, lng: c.lng, kind: (c.busy ? 'courier-busy' : 'courier') as MapPoint['kind'], label: c.name })),
    ...q.data.orders.filter((o) => o.status === 'READY' && !o.courierId).map((o) => ({ id: `o-${o.id}`, lat: o.store.lat, lng: o.store.lng, kind: 'store' as const, label: `#${o.number} esperando entregador` })),
  ];
  return <DeliveryMap points={points} className={className} />;
}

const ACTIVE: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'];

export function OverviewPage() {
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<Overview>('/admin/overview'), refetchInterval: 60_000 });
  const o = q.data;
  if (!o) return <PageLoader />;
  const dd = (d: string) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const todo = [
    { n: o.pending.waitingCourier, label: plural(o.pending.waitingCourier, 'pedido pronto sem entregador', 'pedidos prontos sem entregador'), to: '/admin/pedidos', urgent: true },
    { n: o.pending.stores, label: plural(o.pending.stores, 'loja para aprovar', 'lojas para aprovar'), to: '/admin/aprovacoes' },
    { n: o.pending.couriers, label: plural(o.pending.couriers, 'entregador para aprovar', 'entregadores para aprovar'), to: '/admin/aprovacoes' },
    { n: o.pending.reports, label: plural(o.pending.reports, 'denúncia aberta', 'denúncias abertas'), to: '/admin/denuncias' },
  ].filter((t) => t.n > 0);
  return (
    <>
      <PageHeader title="Visão geral" description="Hoje na plataforma" />
      {todo.length > 0 && (
        <ul className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {todo.map((t) => (
            <li key={t.label}>
              <Link to={t.to} className="flex h-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-ink no-underline hover:border-subtle">
                <span className={cn('text-2xl font-extrabold tabular-nums', t.urgent && 'text-danger')}>{t.n}</span>
                <span className="text-sm font-bold">{t.label.replace(/^\d+ /, '')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pedidos hoje" value={o.today.orders} hint={`${o.today.delivered} entregues, ${o.today.lost} perdidos`} />
        <Stat label="Vendas entregues" value={money(o.today.gmv)} hint={`Receita da plataforma ${money(o.today.revenue)}`} />
        <Stat label="Tempo médio" value={o.today.avgMin ? `${Math.round(o.today.avgMin)} min` : '—'} hint="Do pedido à entrega" />
        <Stat label="Entregadores online" value={o.couriersOnline} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-lg">Ao vivo</h2>
            <div className="flex gap-4 text-[13px] text-muted">
              {ACTIVE.map((s) => (
                <span key={s}>
                  {ORDER_STATUS[s].label}: <b className="text-ink tabular-nums">{o.active[s] ?? 0}</b>
                </span>
              ))}
            </div>
          </div>
          <FleetMap className="h-80 rounded-none" />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg">Pedidos, últimos 14 dias</h2>
          <BarChart label="Pedidos por dia" data={o.daily.map((d) => ({ label: dd(d.day), value: d.orders, hint: `${dd(d.day)}, ${money(d.gmv)} entregues` }))} />
        </Card>
      </div>
    </>
  );
}
