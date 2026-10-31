import { Bike, Search } from 'lucide-react';
import { Button, ButtonRow, cn } from '../../ds';
import { money, PAYMENT } from '../../lib/format';
import type { Order } from '../../lib/types';
import type { useOrderActions } from './orderActions';

/** Minutos parado na etapa atual: verde, depois amarelo e vermelho quando atrasa */
const LIMITS: Partial<Record<Order['status'], [number, number]>> = { PENDING: [3, 6], PREPARING: [25, 40], READY: [10, 20], PICKED_UP: [25, 40] };
const since = (o: Order) => (o.status === 'PENDING' ? o.createdAt : o.status === 'PREPARING' ? o.acceptedAt : o.status === 'READY' ? o.readyAt : o.pickedUpAt) ?? o.createdAt;

/**
 * Pedido como comanda de cozinha: número grande, tempo na etapa, itens com a quantidade
 * em coluna e a ação principal embaixo.
 */
export function OrderTicket({ o, now, actions, onOpen, canAct = true }: { o: Order; now: number; actions: ReturnType<typeof useOrderActions>; onOpen: () => void; canAct?: boolean }) {
  const min = Math.max(0, Math.floor((now - new Date(since(o)).getTime()) / 60000));
  const [warn, late] = LIMITS[o.status] ?? [999, 999];
  const busy = actions.busy?.startsWith(o.id);
  return (
    <article className="grid rounded-card border border-line bg-surface">
      <button type="button" onClick={onOpen} className="grid gap-3 p-4 text-left">
        <header className="flex items-start justify-between gap-3">
          <div className="grid">
            <span className="text-[26px] leading-none font-extrabold text-ink tabular-nums">#{o.number}</span>
            <span className="mt-1 truncate text-sm text-text">{o.customer?.name}</span>
          </div>
          <span className={cn('rounded-sm px-2 py-1 text-sm font-bold tabular-nums', min >= late ? 'bg-danger text-white' : min >= warn ? 'bg-warn-soft text-warn' : 'bg-field text-muted')}>{min} min</span>
        </header>
        <ul className="grid gap-1 border-t border-dashed border-line pt-3 text-sm">
          {o.items.map((it, i) => (
            <li key={i} className="grid grid-cols-[28px_1fr] gap-1">
              <span className="font-extrabold text-ink tabular-nums">{it.qty}</span>
              <span className="min-w-0">
                <span className="text-ink">{it.name}</span>
                {it.options.length > 0 && <span className="block text-[13px] text-muted">{it.options.map((x) => x.name).join(', ')}</span>}
                {it.notes && <span className="block text-[13px] font-bold text-warn">{it.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
        {o.notes && <p className="rounded-sm bg-warn-soft px-2 py-1.5 text-[13px] text-warn">{o.notes}</p>}
        <footer className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-3 text-[13px] text-muted">
          <span>{PAYMENT[o.paymentMethod]}</span>
          <strong className="text-sm text-ink tabular-nums">{money(o.totalCents)}</strong>
        </footer>
        {(o.status === 'READY' || o.status === 'PICKED_UP') && (
          <p className={cn('flex items-center gap-2 text-[13px]', o.courier ? 'text-text' : 'text-warn')}>
            {o.courier ? <Bike size={15} aria-hidden /> : <Search size={15} aria-hidden />}
            {o.courier ? (o.status === 'READY' ? `${o.courier.name} vem retirar` : `Com ${o.courier.name}`) : 'Procurando entregador'}
          </p>
        )}
        {o.status === 'PREPARING' && o.courier && <p className="flex items-center gap-2 text-[13px] text-text"><Bike size={15} aria-hidden /> {o.courier.name} já foi designado</p>}
      </button>
      {canAct && o.status === 'PENDING' && (
        <ButtonRow className="px-4 pb-4">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => actions.reject(o)}>
            Recusar
          </Button>
          <Button size="sm" loading={actions.busy === o.id + 'accept'} disabled={busy} onClick={() => actions.accept(o)}>
            Aceitar
          </Button>
        </ButtonRow>
      )}
      {canAct && o.status === 'PREPARING' && (
        <div className="px-4 pb-4">
          <Button variant="dark" size="sm" full loading={actions.busy === o.id + 'ready'} onClick={() => actions.ready(o)}>
            Marcar como pronto
          </Button>
        </div>
      )}
    </article>
  );
}
