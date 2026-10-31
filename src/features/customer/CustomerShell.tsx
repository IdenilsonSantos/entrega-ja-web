import { ChevronDown, Home, LocateFixed, MapPin, Plus, Receipt, ShoppingBag, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, buttonClass, CountBadge, Dialog, IconButton, cn, useToast } from '../../ds';
import { useAuth } from '../../lib/auth';
import { currentPosition } from '../../lib/geo';
import { BottomNav, NotificationBell, Wordmark } from '../shared/Shell';
import { AddressDialog } from './AddressDialog';
import { useCart } from './cart';
import { useDelivery } from './location';

/** Escolher onde receber: endereços salvos, localização atual ou novo endereço */
export function AddressPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me } = useAuth();
  const { place, addresses, choose, usePoint } = useDelivery();
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const locate = async () => {
    try {
      usePoint(await currentPosition(), 'Localização atual');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <Dialog open={open && !creating} onClose={onClose} title="Onde você quer receber?" size="sm">
        <div className="grid divide-y divide-line">
          {addresses.map((a) => (
            <button key={a.id} type="button" onClick={() => (choose(a), onClose())} className={cn('flex items-start gap-3 py-3 text-left', place.address?.id === a.id && 'text-primary-text')}>
              <MapPin size={20} className="mt-0.5 shrink-0" aria-hidden />
              <span className="grid min-w-0">
                <strong className="text-ink">{a.label}</strong>
                <span className="truncate text-sm text-muted">
                  {a.street}
                  {a.complement ? `, ${a.complement}` : ''}
                </span>
              </span>
            </button>
          ))}
          <button type="button" onClick={locate} className="flex items-center gap-3 py-3 text-left font-bold text-ink">
            <LocateFixed size={20} aria-hidden /> Usar minha localização
          </button>
          {me?.role === 'CUSTOMER' ? (
            <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-3 py-3 text-left font-bold text-primary-text">
              <Plus size={20} aria-hidden /> Novo endereço
            </button>
          ) : (
            <p className="py-3 text-sm text-muted">
              <Link to="/entrar">Entre</Link> para salvar seus endereços.
            </p>
          )}
        </div>
      </Dialog>
      <AddressDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(a) => {
          choose(a);
          onClose();
        }}
      />
    </>
  );
}

export function CustomerShell({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const { count } = useCart();
  const { place } = useDelivery();
  const [picking, setPicking] = useState(false);
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="hidden no-underline sm:block">
            <Wordmark />
          </Link>
          <button type="button" onClick={() => setPicking(true)} className="flex min-w-0 items-center gap-2 rounded-field px-2 py-1.5 text-left hover:bg-hover sm:ml-4">
            <MapPin size={18} className="shrink-0 text-primary" aria-hidden />
            <span className="grid min-w-0">
              <span className="text-xs text-muted">Entregar em</span>
              <span className="flex items-center gap-1 truncate text-sm font-bold text-ink">
                <span className="truncate">{place.address?.label ?? place.label}</span>
                <ChevronDown size={15} className="shrink-0" aria-hidden />
              </span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {me && <NotificationBell />}
            <Link to="/sacola" className="relative hidden sm:block" aria-label="Sacola">
              <IconButton icon={ShoppingBag} label="Sacola" tabIndex={-1} badge={<CountBadge count={count} />} />
            </Link>
            {me ? (
              <Link to="/conta" className="hidden rounded-full sm:block" aria-label="Minha conta">
                <Avatar name={me.name} src={me.avatarUrl} size={40} />
              </Link>
            ) : (
              <Link to="/entrar" className={buttonClass({ size: 'sm' })}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 pt-5 pb-28 sm:px-6 sm:pb-16">{children}</main>
      <BottomNav
        className="sm:hidden"
        items={[
          { to: '/', label: 'Início', icon: Home, end: true },
          { to: '/pedidos', label: 'Pedidos', icon: Receipt },
          { to: '/sacola', label: 'Sacola', icon: ShoppingBag, count },
          { to: me ? '/conta' : '/entrar', label: 'Conta', icon: UserRound },
        ]}
      />
      <AddressPicker open={picking} onClose={() => setPicking(false)} />
    </div>
  );
}
