import { useQuery } from '@tanstack/react-query';
import { BarChart, Card, PageHeader, PageLoader, Stat } from '../../ds';
import { api } from '../../lib/api';
import { km, money, plural } from '../../lib/format';

interface Earnings {
  today: number;
  todayCount: number;
  week: number;
  weekCount: number;
  month: number;
  total: number;
  totalCount: number;
  km: number;
  daily: { day: string; cents: number; count: number }[];
}

export function EarningsPage() {
  const q = useQuery({ queryKey: ['courier', 'earnings'], queryFn: () => api.get<Earnings>('/courier/earnings') });
  const e = q.data;
  if (!e) return <PageLoader />;
  const wd = (d: string) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ganhos" description="Valores das entregas concluídas" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Hoje" value={money(e.today)} hint={plural(e.todayCount, 'entrega', 'entregas')} />
        <Stat label="Últimos 7 dias" value={money(e.week)} hint={plural(e.weekCount, 'entrega', 'entregas')} />
        <Stat label="Este mês" value={money(e.month)} hint={`Total: ${money(e.total)} em ${plural(e.totalCount, 'entrega', 'entregas')}, ${km(e.km)}`} />
      </div>
      <Card>
        <h2 className="mb-4 text-lg">Últimos 7 dias</h2>
        <BarChart label="Ganhos por dia" data={e.daily.map((d) => ({ label: wd(d.day), value: d.cents, hint: `${wd(d.day)}, ${plural(d.count, 'entrega', 'entregas')}` }))} format={money} />
      </Card>
    </div>
  );
}
