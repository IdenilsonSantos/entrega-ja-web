import { useQuery } from '@tanstack/react-query';
import { Bike } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Avatar, Badge, Button, Dialog, EmptyState, SearchInput, Spinner, VirtualScroller, cn, useToast } from '../../ds';
import { api, qs } from '../../lib/api';
import { km, VEHICLE } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { AdminOrder, Candidate } from './types';

/**
 * Escolher o entregador de um pedido. Lista todos os aprovados: livres e mais perto da loja
 * primeiro, depois os ocupados e, por último, os offline (dá para designar mesmo assim).
 */
export function AssignCourierDialog({ order, open, onClose }: { order: AdminOrder; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const search = useDeferredValue(q.trim());
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ['admin', 'candidates', order.id, search],
    queryFn: () => api.get<Candidate[]>(`/admin/orders/${order.id}/couriers${qs({ q: search })}`),
    enabled: open,
    refetchInterval: open ? 15_000 : false,
  });

  const assign = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await api.post(`/admin/orders/${order.id}/assign`, { courierId: picked });
      const c = list.data?.find((x) => x.id === picked);
      toast.success('Entregador designado', `${c?.name} recebeu o pedido #${order.number}.`);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setPicked(null);
      onClose();
    } catch (e) {
      toast.error('Não foi possível designar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={order.courier ? 'Trocar entregador' : 'Atribuir entregador'}
      description={`Pedido #${order.number}, retirada em ${order.store.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!picked} onClick={assign}>
            Designar entregador
          </Button>
        </>
      }
    >
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar entregador" className="mb-3" />
      {list.isLoading ? (
        <Spinner className="m-6" />
      ) : !list.data?.length ? (
        <EmptyState icon={Bike} title={search ? 'Ninguém com esse nome' : 'Nenhum entregador aprovado'} description={search ? undefined : 'Aprove entregadores na fila de aprovações.'} />
      ) : (
        <div role="radiogroup" aria-label="Entregadores">
          <VirtualScroller
            items={list.data}
            estimate={65}
            className="max-h-[50dvh]"
            render={(c, i) => (
              <label className={cn('flex cursor-pointer items-center gap-3 px-1 py-3', i > 0 && 'border-t border-line', c.current && 'cursor-default opacity-60', picked === c.id && 'bg-primary-soft')}>
                <input type="radio" name="courier" className="size-5 accent-primary" checked={picked === c.id} disabled={c.current} onChange={() => setPicked(c.id)} />
                <Avatar name={c.name} src={c.avatarUrl} size={38} />
                <span className="grid min-w-0 flex-1">
                  <strong className="truncate text-ink">{c.name}</strong>
                  <span className="truncate text-[13px] text-muted">{[c.vehicleType && VEHICLE[c.vehicleType], c.vehiclePlate].filter(Boolean).join(', ') || 'Sem veículo informado'}</span>
                </span>
                <span className="grid justify-items-end gap-1 text-[13px]">
                  {c.current ? (
                    <Badge tone="primary">No pedido</Badge>
                  ) : !c.online ? (
                    <Badge>Offline</Badge>
                  ) : c.busy ? (
                    <Badge tone="warn">Em entrega</Badge>
                  ) : (
                    <Badge tone="success">Livre</Badge>
                  )}
                  {c.distanceKm !== null && <span className="text-muted tabular-nums">{km(c.distanceKm)} da loja</span>}
                </span>
              </label>
            )}
          />
        </div>
      )}
    </Dialog>
  );
}
