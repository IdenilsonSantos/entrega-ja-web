import { Bike, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Rating, Thumb, cn } from '../../ds';
import { km, money } from '../../lib/format';
import type { Store } from '../../lib/types';

/** Loja na vitrine: logo, nome, nota e as três coisas que decidem o pedido (tempo, taxa, distância) */
export function StoreRow({ store }: { store: Store }) {
  return (
    <Link to={`/lojas/${store.id}`} className={cn('flex items-center gap-4 rounded-card p-2 text-inherit no-underline transition hover:bg-hover', !store.isOpen && 'opacity-60')}>
      <Thumb src={store.logoUrl} name={store.name} className="size-[72px] text-2xl" />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base">{store.name}</h3>
          {!store.isOpen && <span className="shrink-0 text-xs font-bold text-danger">Fechada</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
          <Rating value={store.ratingAvg} className="text-[13px]" />
          <span>{store.category}</span>
          <span>{km(store.distanceKm)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-text">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} aria-hidden /> {store.prepTimeMin}–{store.prepTimeMin + 15} min
          </span>
          <span className={cn('inline-flex items-center gap-1', store.deliveryFeeCents === 0 && 'font-bold text-success')}>
            <Bike size={13} aria-hidden /> {store.deliveryFeeCents === 0 ? 'Entrega grátis' : money(store.deliveryFeeCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
