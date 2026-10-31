import { useState } from 'react';
import { useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { patchEverywhere, queryClient } from '../../lib/query';
import type { Order } from '../../lib/types';

/** Ações da loja sobre um pedido, com confirmação e motivo quando precisa */
export function useOrderActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (o: Order, action: 'accept' | 'ready' | 'reject' | 'cancel', body?: unknown) => {
    setBusy(o.id + action);
    try {
      const updated = await api.post<Order>(`/merchant/orders/${o.id}/${action}`, body ?? {});
      patchEverywhere(updated, (k) => k.includes('orders') || k[0] === 'order');
      queryClient.invalidateQueries({ queryKey: ['merchant', o.store.id, 'orders'] });
      return updated;
    } catch (e) {
      toast.error('Não foi possível atualizar o pedido', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return {
    busy,
    accept: (o: Order) => run(o, 'accept'),
    ready: (o: Order) => run(o, 'ready'),
    reject: async (o: Order) => {
      const reason = await confirm({ title: `Recusar o pedido #${o.number}?`, description: 'A cliente é avisada na hora com o motivo.', tone: 'danger', confirmLabel: 'Recusar pedido', reason: { label: 'Motivo', placeholder: 'Ingrediente em falta, fora do horário…' } });
      if (typeof reason === 'string') return run(o, 'reject', { reason });
    },
    cancel: async (o: Order) => {
      const reason = await confirm({ title: `Cancelar o pedido #${o.number}?`, description: 'A cliente e o entregador são avisados.', tone: 'danger', confirmLabel: 'Cancelar pedido', reason: { label: 'Motivo' } });
      if (typeof reason === 'string') return run(o, 'cancel', { reason });
    },
  };
}
