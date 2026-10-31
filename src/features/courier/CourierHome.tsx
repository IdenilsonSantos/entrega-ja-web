import { Navigation, Phone, Power } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, buttonClass, ButtonRow, Card, Input, PageLoader, cn, useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { km, money, PAYMENT, phoneLink } from '../../lib/format';
import { profileFor, useRoute } from '../../lib/route';
import { queryClient } from '../../lib/query';
import type { Offer, Order } from '../../lib/types';
import { DeliveryMap, type MapPoint } from '../shared/DeliveryMap';
import { OrderItems } from '../shared/order';
import { STATUS_KEY, useShift } from './shift';

// ferramenta de teste: com a constante de build direto na condição, o import some do pacote de produção
declare const __DEMO_TOOLS__: boolean;
const Simulator = __DEMO_TOOLS__ ? lazy(() => import('./Simulator')) : null;

const MISSING: Record<string, string> = {
  vehiclePlate: 'Placa do veículo',
  licenseNumber: 'Número da CNH',
  vehicleModel: 'Modelo do veículo',
  document: 'CPF',
  pixKey: 'Chave Pix para receber',
};

const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

function OnlineSwitch() {
  const { online, toggling, setOnline } = useShift();
  return (
    <button
      type="button"
      onClick={() => setOnline(!online)}
      disabled={toggling}
      aria-pressed={online}
      className={cn('flex w-full items-center gap-4 rounded-card p-5 text-left transition', online ? 'bg-success text-white' : 'bg-navy text-white')}
    >
      <span className={cn('grid size-12 place-items-center rounded-full', online ? 'bg-white/20' : 'bg-white/10')}>
        <Power size={24} aria-hidden />
      </span>
      <span className="grid flex-1">
        <strong className="text-lg">{toggling ? 'Aguarde…' : online ? 'Você está online' : 'Você está offline'}</strong>
        <span className="text-sm text-white/80">{online ? 'Recebendo corridas perto de você. Toque para sair.' : 'Toque para começar a receber corridas.'}</span>
      </span>
    </button>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const toast = useToast();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const total = useMemo(() => Math.max(1, (new Date(offer.expiresAt).getTime() - Date.now()) / 1000), [offer.orderId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [left, setLeft] = useState(total);
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, (new Date(offer.expiresAt).getTime() - Date.now()) / 1000)), 250);
    return () => clearInterval(t);
  }, [offer.expiresAt]);
  const act = async (kind: 'accept' | 'decline') => {
    setBusy(kind);
    try {
      await api.post(`/courier/offers/${offer.orderId}/${kind}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    }
  };
  const points: MapPoint[] = [
    { id: 's', lat: offer.storeLat, lng: offer.storeLng, kind: 'store', label: offer.storeName },
    { id: 'd', lat: offer.deliveryLat, lng: offer.deliveryLng, kind: 'home', label: 'Entrega' },
  ];
  const { me } = useAuth();
  const { path } = useRoute({ lat: offer.storeLat, lng: offer.storeLng }, { lat: offer.deliveryLat, lng: offer.deliveryLng }, profileFor(me?.courier?.vehicleType));
  return (
    <section className="grid overflow-hidden rounded-card border border-line bg-surface" aria-live="assertive">
      <div className="h-1.5 bg-field">
        <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${(left / total) * 100}%` }} />
      </div>
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-sm font-bold text-primary-text">Nova corrida</span>
            <p className="text-[34px] leading-none font-extrabold text-ink tabular-nums">{money(offer.feeCents)}</p>
          </div>
          <span className="text-2xl font-extrabold text-muted tabular-nums">{Math.ceil(left)}s</span>
        </div>
        <ol className="grid gap-3 text-sm">
          <li className="grid">
            <span className="text-muted">Retirar em, {km(offer.pickupKm)} de você</span>
            <strong className="text-ink">{offer.storeName}</strong>
            <span className="text-text">{offer.storeAddress}</span>
          </li>
          <li className="grid">
            <span className="text-muted">Entregar em, {km(offer.tripKm)} da loja</span>
            <strong className="text-ink">{offer.deliveryAddress}</strong>
          </li>
        </ol>
        <DeliveryMap points={points} path={path} className="h-44" />
        <ButtonRow>
          <Button variant="outline" loading={busy === 'decline'} disabled={!!busy} onClick={() => act('decline')}>
            Recusar
          </Button>
          <Button loading={busy === 'accept'} disabled={!!busy || left <= 0} onClick={() => act('accept')}>
            Aceitar
          </Button>
        </ButtonRow>
      </div>
    </section>
  );
}

function ActiveDelivery({ o }: { o: Order }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { position } = useShift();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const { me } = useAuth();
  const goingToStore = o.status !== 'PICKED_UP';
  const target = goingToStore ? { lat: o.store.lat, lng: o.store.lng } : { lat: o.deliveryLat, lng: o.deliveryLng };
  // melhor caminho pelas ruas, recalculado quando ele sai da rota
  const { path, etaMin, route } = useRoute(position, target, profileFor(me?.courier?.vehicleType));
  const points: MapPoint[] = [
    goingToStore ? { id: 's', ...target, kind: 'store', label: o.store.name } : { id: 'd', ...target, kind: 'home', label: o.customer?.name },
    ...(position ? [{ id: 'me', ...position, kind: 'courier' as const, label: 'Você' }] : []),
  ];

  return (
    <Card className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[26px] leading-none font-extrabold text-ink tabular-nums">#{o.number}</span>
        <span className="text-sm font-bold text-ink">{money(o.courierFeeCents ?? 0)}</span>
      </div>

      {goingToStore ? (
        <div className="grid gap-1">
          <span className="text-sm text-muted">{o.status === 'PREPARING' ? 'A loja ainda está preparando. Pode ir indo.' : 'Pronto para retirar'}</span>
          <strong className="text-lg text-ink">{o.store.name}</strong>
          <span className="text-sm">{o.store.address}</span>
        </div>
      ) : (
        <div className="grid gap-1">
          <span className="text-sm text-muted">Entregar para</span>
          <strong className="text-lg text-ink">{o.customer?.name}</strong>
          <span className="text-sm">{[o.deliveryAddress, o.deliveryComplement].filter(Boolean).join(', ')}</span>
          {o.deliveryReference && <span className="text-[13px] text-muted">{o.deliveryReference}</span>}
        </div>
      )}

      <DeliveryMap points={points} path={path} className="h-56" />
      {etaMin && route && (
        <p className="-mt-2 text-sm text-text">
          <b className="text-ink">{etaMin} min</b> até {goingToStore ? 'a loja' : 'a cliente'}, {km(route.distanceKm)} pelo caminho
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={mapsLink(target.lat, target.lng)} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'sm' })}>
          <Navigation size={15} /> Abrir rota
        </a>
        {!goingToStore && o.customer?.phone && (
          <a href={phoneLink(o.customer.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
            <Phone size={15} /> Ligar para a cliente
          </a>
        )}
        {goingToStore && o.store.phone && (
          <a href={phoneLink(o.store.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
            <Phone size={15} /> Ligar para a loja
          </a>
        )}
      </div>

      {Simulator && (
        <Suspense fallback={null}>
          <Simulator target={target} label={goingToStore ? 'a loja' : 'a cliente'} />
        </Suspense>
      )}

      {o.status === 'READY' && (
        <Button full loading={busy} onClick={() => run(() => api.post(`/courier/orders/${o.id}/pickup`))}>
          Retirei o pedido
        </Button>
      )}
      {o.status === 'PICKED_UP' && (
        <div className="grid gap-3 border-t border-line pt-4">
          <details className="text-sm">
            <summary className="cursor-pointer font-bold text-ink">Conferir itens ({o.items.reduce((s, i) => s + i.qty, 0)})</summary>
            <div className="pt-3">
              <OrderItems items={o.items} prices={false} />
            </div>
          </details>
          <Alert tone={o.paymentMethod === 'CASH' ? 'warn' : 'info'}>
            Receber {money(o.totalCents)}: {PAYMENT[o.paymentMethod].toLowerCase()}
            {o.changeForCents ? `, levar troco para ${money(o.changeForCents)}` : ''}.
          </Alert>
          <label htmlFor={`code-${o.id}`} className="text-sm font-bold text-ink">
            Código que a cliente informar
          </label>
          <div className="grid gap-2">
            <Input
              id={`code-${o.id}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={cn('text-center text-2xl font-extrabold tracking-[0.5em]', shake && 'animate-shake')}
              placeholder="0000"
            />
            <Button
              full
              variant="success"
              loading={busy}
              disabled={code.length !== 4}
              onClick={async () => {
                const ok = await run(() => api.post(`/courier/orders/${o.id}/deliver`, { code }));
                if (ok) toast.success('Entrega confirmada', `${money(o.courierFeeCents ?? 0)} somados aos seus ganhos.`);
                else {
                  setShake(true);
                  setTimeout(() => setShake(false), 500);
                }
              }}
            >
              Confirmar entrega
            </Button>
          </div>
        </div>
      )}
      {o.status !== 'PICKED_UP' && (
        <button
          type="button"
          className="justify-self-start text-sm font-bold text-muted hover:text-danger"
          onClick={async () => {
            const reason = await confirm({ title: 'Desistir desta entrega?', description: 'O pedido volta para a busca e outro entregador recebe a oferta.', tone: 'danger', confirmLabel: 'Desistir', reason: { label: 'Motivo' } });
            if (typeof reason === 'string') run(() => api.post(`/courier/orders/${o.id}/drop`, { reason }));
          }}
        >
          Não vou conseguir fazer esta entrega
        </button>
      )}
    </Card>
  );
}

export function CourierHome() {
  const { me } = useAuth();
  const { status, online, position } = useShift();
  if (!status || !me) return <PageLoader />;

  if (!status.approved) {
    const missing = me.courier?.missing ?? [];
    return (
      <div className="mx-auto grid max-w-xl gap-5">
        <h1>Cadastro em análise</h1>
        <p className="text-text">A plataforma confere seus dados e o veículo antes de liberar as corridas. Você recebe uma notificação quando for aprovado.</p>
        {me.statusReason && (
          <Alert tone="warn" title="Ajuste pedido pela plataforma">
            {me.statusReason}
          </Alert>
        )}
        {missing.length > 0 && (
          <Card>
            <h2 className="mb-2 text-lg">Falta preencher</h2>
            <ul className="mb-4 list-disc pl-5 text-sm">
              {missing.map((m) => (
                <li key={m}>{MISSING[m] ?? m}</li>
              ))}
            </ul>
            <Link to="/entregador/perfil" className={buttonClass()}>
              Completar perfil
            </Link>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-xl gap-5">
      <OnlineSwitch />
      {status.offer && <OfferCard offer={status.offer} />}
      {status.active.map((o) => (
        <ActiveDelivery key={o.id} o={o} />
      ))}
      {!status.offer && !status.active.length && (
        <Card className="grid gap-3">
          <h2 className="text-lg">{online ? 'Esperando corridas' : 'Sem corridas agora'}</h2>
          <p className="text-sm text-muted">{online ? 'Quando um pedido ficar pronto perto de você, a oferta aparece aqui com um bip e uma notificação.' : 'Fique online para receber ofertas. Da próxima vez que abrir o app, você volta online sozinho.'}</p>
          {online && position && <DeliveryMap points={[{ id: 'me', ...position, kind: 'courier', label: 'Você' }]} className="h-52" />}
        </Card>
      )}
    </div>
  );
}
