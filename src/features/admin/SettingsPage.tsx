import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Card, Field, Input, MoneyInput, PageHeader, PageLoader, useToast } from '../../ds';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { queryClient } from '../../lib/query';

interface Settings {
  commissionPercent: number;
  courierBaseCents: number;
  courierPerKmCents: number;
  dispatchRadiusKm: number;
}

/** Regras da plataforma: valem para os próximos pedidos */
export function SettingsPage() {
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get<Settings>('/admin/settings') });
  const [v, setV] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setV(q.data);
  }, [q.data]);
  if (!v) return <PageLoader />;
  const save = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(['admin', 'settings'], await api.put<Settings>('/admin/settings', v));
      toast.success('Regras atualizadas', 'Valem para os próximos pedidos.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-2xl">
      <PageHeader title="Regras da plataforma" description="Mudanças valem para os próximos pedidos e ficam na auditoria." />
      <div className="grid gap-5">
        <Card className="grid gap-4">
          <h2 className="text-lg">Comissão</h2>
          <Field label="Comissão sobre o subtotal" hint="Descontada do valor que a loja recebe">
            {(p) => <Input {...p} type="number" min={0} max={50} step={0.5} value={v.commissionPercent} onChange={(e) => setV({ ...v, commissionPercent: Number(e.target.value) })} suffix="%" className="max-w-40" />}
          </Field>
        </Card>
        <Card className="grid gap-4">
          <h2 className="text-lg">Pagamento do entregador</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor fixo por corrida">{(p) => <MoneyInput {...p} value={v.courierBaseCents} onChange={(c) => setV({ ...v, courierBaseCents: c ?? 0 })} />}</Field>
            <Field label="Mais, por km">{(p) => <MoneyInput {...p} value={v.courierPerKmCents} onChange={(c) => setV({ ...v, courierPerKmCents: c ?? 0 })} />}</Field>
          </div>
          <p className="text-sm text-muted">Exemplo: uma entrega de 3 km paga {money(v.courierBaseCents + v.courierPerKmCents * 3)} ao entregador.</p>
        </Card>
        <Card className="grid gap-4">
          <h2 className="text-lg">Busca de entregador</h2>
          <Field label="Procurar entregadores até" hint="Distância a partir da loja">
            {(p) => <Input {...p} type="number" min={1} max={30} step={0.5} value={v.dispatchRadiusKm} onChange={(e) => setV({ ...v, dispatchRadiusKm: Number(e.target.value) })} suffix="km" className="max-w-40" />}
          </Field>
        </Card>
        <Button size="lg" className="justify-self-start" loading={busy} onClick={save}>
          Salvar regras
        </Button>
      </div>
    </div>
  );
}
