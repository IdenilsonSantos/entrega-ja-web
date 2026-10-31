import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart, Card, PageHeader, Segmented, Skeleton, Stat } from '../../ds';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { useStore } from './storeContext';

interface Stats {
  days: number;
  delivered: number;
  lost: number;
  revenue: number;
  fees: number;
  prepMin: number;
  rating: number;
  daily: { day: string; orders: number; revenue: number }[];
  top: { name: string; qty: number }[];
}

const dayLabel = (d: string) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function DashboardPage() {
  const { store } = useStore();
  const [days, setDays] = useState<'7' | '30'>('7');
  const q = useQuery({ queryKey: ['merchant', store.id, 'stats', days], queryFn: () => api.get<Stats>(`/merchant/stores/${store.id}/stats?days=${days}`) });
  const s = q.data;
  return (
    <>
      <PageHeader title={store.name} description="Resultado dos pedidos entregues" actions={<Segmented label="Período" value={days} onChange={setDays} options={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />} />
      {!s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Faturamento" value={money(s.revenue)} hint={`Comissão da plataforma: ${money(s.fees)}`} />
            <Stat label="Pedidos entregues" value={s.delivered} hint={s.lost ? `${s.lost} recusados ou cancelados` : 'Nenhum perdido'} />
            <Stat label="Ticket médio" value={s.delivered ? money(Math.round(s.revenue / s.delivered)) : '—'} />
            <Stat label="Preparo médio" value={s.prepMin ? `${Math.round(s.prepMin)} min` : '—'} hint={s.rating ? `Nota média ${s.rating.toFixed(1).replace('.', ',')}` : undefined} />
          </div>
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <Card>
              <h2 className="mb-4 text-lg">Faturamento por dia</h2>
              <BarChart label="Faturamento por dia" data={s.daily.map((d) => ({ label: dayLabel(d.day), value: d.revenue, hint: `${dayLabel(d.day)}, ${d.orders} pedidos` }))} format={money} />
            </Card>
            <Card>
              <h2 className="mb-3 text-lg">Mais vendidos</h2>
              {s.top.length ? (
                <ol className="divide-y divide-line">
                  {s.top.map((t, i) => (
                    <li key={t.name} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-5 text-muted tabular-nums">{i + 1}</span>
                      <span className="flex-1 text-ink">{t.name}</span>
                      <span className="text-muted tabular-nums">{t.qty} un.</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Nenhuma venda no período.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
