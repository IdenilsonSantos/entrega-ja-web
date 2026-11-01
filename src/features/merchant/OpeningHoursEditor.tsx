import { Copy, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, IconButton, Input, Switch, TextButton, useToast } from '../../ds';
import { api } from '../../lib/api';
import { openLabel, WEEKDAYS } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { MerchantStore, OpeningRange } from '../../lib/types';
import { storeKey } from './storeContext';

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT: Omit<OpeningRange, 'day'> = { open: '11:00', close: '23:00' };
const same = (a: OpeningRange[] | null, b: OpeningRange[] | null) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Horário de funcionamento: um ou mais turnos por dia. Com horário, a loja abre e fecha sozinha
 * (o botão do topo vira pausa). Fechar depois da meia-noite: é só pôr o fechamento menor que a abertura.
 */
export function OpeningHoursEditor({ store }: { store: MerchantStore }) {
  const toast = useToast();
  const [hours, setHours] = useState<OpeningRange[] | null>(store.openingHours);
  const [busy, setBusy] = useState(false);
  useEffect(() => setHours(store.openingHours), [store.openingHours]);

  const dirty = !same(hours, store.openingHours);
  const of = (day: number) => (hours ?? []).filter((r) => r.day === day);
  const setDay = (day: number, ranges: Omit<OpeningRange, 'day'>[]) =>
    setHours((h) => [...(h ?? []).filter((r) => r.day !== day), ...ranges.map((r) => ({ day, ...r }))].sort((a, b) => a.day - b.day || a.open.localeCompare(b.open)));
  const copyToAll = (day: number) => {
    const src = of(day).map(({ open, close }) => ({ open, close }));
    setHours(ORDER.flatMap((d) => src.map((r) => ({ day: d, ...r }))));
  };

  const save = async () => {
    setBusy(true);
    try {
      const next = await api.patch<MerchantStore>(`/merchant/stores/${store.id}`, { openingHours: hours?.length ? hours : null });
      queryClient.setQueryData(storeKey(store.id), next);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Horário salvo', openLabel(next));
    } catch (e) {
      toast.error('Não foi possível salvar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="grid gap-5">
      <Switch
        checked={hours !== null}
        onChange={(v) => setHours(v ? [1, 2, 3, 4, 5, 6].map((day) => ({ day, ...DEFAULT })) : null)}
        label="Abrir e fechar pelo horário"
        description={hours === null ? 'Desligado: a loja só abre e fecha pelo botão do topo.' : 'Com o botão do topo em "Aberta", a loja recebe pedidos só dentro do horário. Desligar o botão pausa a loja.'}
      />
      {hours !== null && (
        <ul className="grid divide-y divide-line">
          {ORDER.map((day) => {
            const ranges = of(day);
            return (
              <li key={day} className="grid gap-2 py-3 sm:grid-cols-[130px_1fr] sm:items-start">
                <Checkbox label={WEEKDAYS[day]} checked={ranges.length > 0} onChange={(e) => setDay(day, e.target.checked ? [DEFAULT] : [])} className="pt-2" />
                {ranges.length ? (
                  <div className="grid gap-2">
                    {ranges.map((r, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <Input type="time" aria-label={`${WEEKDAYS[day]}: abre`} value={r.open} required onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { open: e.target.value, close: x.close } : x)))} className="w-[120px]" />
                        <span className="text-muted">às</span>
                        <Input type="time" aria-label={`${WEEKDAYS[day]}: fecha`} value={r.close} required onChange={(e) => setDay(day, ranges.map((x, j) => (j === i ? { open: x.open, close: e.target.value } : x)))} className="w-[120px]" />
                        {r.close <= r.open && r.close !== '00:00' && <span className="text-[13px] text-muted">fecha no dia seguinte</span>}
                        {r.open === '00:00' && r.close === '00:00' && <span className="text-[13px] text-muted">24 horas</span>}
                        <IconButton icon={X} label="Tirar turno" variant="ghost" onClick={() => setDay(day, ranges.filter((_, j) => j !== i))} />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-4">
                      {ranges.length < 4 && (
                        <TextButton onClick={() => setDay(day, [...ranges, { open: '18:00', close: '23:00' }])}>
                          <Plus size={14} aria-hidden /> Outro turno
                        </TextButton>
                      )}
                      <TextButton onClick={() => copyToAll(day)}>
                        <Copy size={14} aria-hidden /> Usar em todos os dias
                      </TextButton>
                    </div>
                  </div>
                ) : (
                  <span className="pt-2 text-sm text-muted">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {dirty && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={save} loading={busy}>
            Salvar horário
          </Button>
          <Button variant="ghost" onClick={() => setHours(store.openingHours)} disabled={busy}>
            Desfazer
          </Button>
        </div>
      )}
    </Card>
  );
}
