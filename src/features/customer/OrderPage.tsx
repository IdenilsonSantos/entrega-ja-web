import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Flag, Phone, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Avatar, Button, buttonClass, Card, Dialog, EmptyState, Field, IconButton, PageLoader, StarInput, Textarea, useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { isActive, minutesSince, ORDER_STATUS, phoneLink, time } from '../../lib/format';
import { profileFor, useRoute } from '../../lib/route';
import { queryClient } from '../../lib/query';
import { useRealtime } from '../../lib/realtime';
import type { Order } from '../../lib/types';
import { DeliveryMap, type MapPoint } from '../shared/DeliveryMap';
import { OrderAddress, OrderItems, OrderSteps, OrderTimeline, OrderTotals, vehicleText } from '../shared/order';
import { Plate } from '../shared/Plate';
import { ReportDialog } from '../shared/ReportDialog';

/** Código de entrega em casas, grande, para ler em voz alta */
function DeliveryCode({ code, hot }: { code: string; hot: boolean }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm text-muted">{hot ? 'O entregador vai pedir este código. Diga só quando receber o pedido.' : 'Código de entrega'}</span>
      <div className="flex gap-2" aria-label={`Código ${code.split('').join(' ')}`}>
        {code.split('').map((d, i) => (
          <span key={i} className="grid h-16 w-13 place-items-center rounded-field border-2 border-ink text-[34px] font-extrabold text-ink tabular-nums">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function RateDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const send = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(['order', order.id], await api.post<Order>(`/orders/${order.id}/rate`, { rating, comment: comment.trim() || undefined }));
      toast.success('Obrigado pela avaliação');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={`Como foi o pedido de ${order.store.name}?`} size="sm" footer={<Button disabled={!rating} loading={busy} onClick={send}>Enviar avaliação</Button>}>
      <div className="grid justify-items-center gap-4">
        <StarInput value={rating} onChange={setRating} />
        <Field label="Comentário" optional className="w-full">
          {(p) => <Textarea {...p} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="Do que você gostou ou o que pode melhorar" />}
        </Field>
      </div>
    </Dialog>
  );
}

export function OrderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [rating, setRating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const q = useQuery({ queryKey: ['order', id], queryFn: () => api.get<Order>(`/orders/${id}`) });
  const o = q.data;
  const tracking = useQuery({
    queryKey: ['tracking', id],
    queryFn: () => api.get<{ courier: { lat: number; lng: number } | null }>(`/orders/${id}/tracking`),
    enabled: !!o?.courier && (o.status === 'READY' || o.status === 'PICKED_UP'),
    refetchInterval: 30_000,
  });
  useRealtime('courier.location', (d: { orderId: string; lat: number; lng: number }) => d.orderId === id && queryClient.setQueryData(['tracking', id], { courier: { lat: d.lat, lng: d.lng } }));
  // a linha do tempo vem só no detalhe: recarrega quando o status muda
  useRealtime('order.updated', (d: Order) => d.id === id && q.refetch());

  const courierPos = tracking.data?.courier ?? null;
  const target = !o ? null : o.status === 'PICKED_UP' ? { lat: o.deliveryLat, lng: o.deliveryLng } : o.status === 'READY' ? { lat: o.store.lat, lng: o.store.lng } : null;
  const { path, etaMin } = useRoute(o?.courier ? courierPos : null, target, profileFor(o?.courier?.vehicle?.type));
  const points = useMemo<MapPoint[]>(() => {
    if (!o) return [];
    const pts: MapPoint[] = [
      { id: 'store', lat: o.store.lat, lng: o.store.lng, kind: 'store', label: o.store.name },
      { id: 'home', lat: o.deliveryLat, lng: o.deliveryLng, kind: 'home', label: 'Você' },
    ];
    const c = tracking.data?.courier;
    if (c && o.courier) pts.push({ id: 'courier', lat: c.lat, lng: c.lng, kind: 'courier', label: o.courier.name });
    return pts;
  }, [o, tracking.data]);

  if (q.isLoading) return <PageLoader />;
  if (!o) return <EmptyState icon={Receipt} title="Pedido não encontrado" action={<Link to="/pedidos" className={buttonClass({ variant: 'outline' })}>Ver meus pedidos</Link>} />;

  const active = isActive(o.status);
  const cancel = async () => {
    if (!(await confirm({ title: 'Cancelar o pedido?', description: 'A loja ainda não aceitou, então não há custo.', confirmLabel: 'Cancelar pedido', tone: 'danger' }))) return;
    try {
      queryClient.setQueryData(['order', id], await api.post<Order>(`/orders/${id}/cancel`));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const eta = o.status === 'PREPARING' && o.acceptedAt ? Math.max(5, o.store.prepTimeMin - minutesSince(o.acceptedAt)) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <IconButton icon={ArrowLeft} label="Voltar" onClick={() => navigate('/pedidos')} />
        <div className="grid min-w-0 flex-1">
          <span className="text-sm text-muted">
            Pedido #{o.number}, feito às {time(o.createdAt)}
          </span>
          <Link to={`/lojas/${o.store.id}`} className="truncate font-bold text-ink no-underline">
            {o.store.name}
          </Link>
        </div>
        <Button variant="ghost" size="sm" icon={Flag} onClick={() => setReporting(true)}>
          Ajuda
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="grid gap-6">
          <section className="grid gap-5">
            <div>
              <h1 className="text-[28px]">{ORDER_STATUS[o.status].customer}</h1>
              {eta && <p className="mt-1 text-muted">Fica pronto em cerca de {eta} min</p>}
              {etaMin && o.courier && o.status === 'PICKED_UP' && <p className="mt-1 text-lg text-ink">Chega em cerca de <b>{etaMin} min</b></p>}
              {etaMin && o.courier && o.status === 'READY' && <p className="mt-1 text-muted">{o.courier.name.split(' ')[0]} chega na loja em cerca de {etaMin} min</p>}
            </div>
            {active && <OrderSteps status={o.status} />}
            {o.status === 'REJECTED' && <Alert tone="danger" title="A loja não pôde aceitar">{o.cancelReason}</Alert>}
            {o.status === 'CANCELLED' && <Alert tone="neutral" title="Pedido cancelado">{o.cancelReason}</Alert>}
          </section>

          {o.courier && (
            <Card className="flex flex-wrap items-center gap-4">
              <Avatar name={o.courier.name} src={o.courier.avatarUrl} size={52} />
              <div className="grid min-w-0 flex-1">
                <strong className="text-ink">{o.courier.name}</strong>
                <span className="text-sm text-muted">{vehicleText(o.courier.vehicle) ?? 'Entregador'}</span>
              </div>
              {o.courier.vehicle?.plate && <Plate plate={o.courier.vehicle.plate} />}
              {o.courier.phone && active && (
                <a href={phoneLink(o.courier.phone)} className={buttonClass({ variant: 'outline', size: 'sm' })}>
                  <Phone size={15} aria-hidden /> Ligar
                </a>
              )}
            </Card>
          )}

          {(o.status === 'READY' || o.status === 'PICKED_UP') && <DeliveryMap points={points} path={path} className="h-72 lg:h-96" />}

          {o.deliveryCode && active && o.status !== 'PENDING' && <DeliveryCode code={o.deliveryCode} hot={o.status === 'PICKED_UP'} />}

          {o.status === 'PENDING' && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted">Você pode cancelar até a loja aceitar.</p>
              <Button variant="danger" size="sm" onClick={cancel}>
                Cancelar pedido
              </Button>
            </div>
          )}
          {o.status === 'DELIVERED' && !o.rating && (
            <Alert tone="primary" title="Avalie o pedido" action={<Button size="sm" onClick={() => setRating(true)}>Avaliar</Button>}>
              Sua nota ajuda outras pessoas a escolher.
            </Alert>
          )}
        </div>

        <aside className="grid gap-6">
          <Card className="grid gap-4">
            <h2 className="text-lg">Itens</h2>
            <OrderItems items={o.items} />
            <div className="border-t border-line pt-4">
              <OrderTotals order={o} />
            </div>
          </Card>
          <Card>
            <OrderAddress order={o} />
          </Card>
          {o.timeline && o.timeline.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg">Histórico</h2>
              <OrderTimeline events={o.timeline} />
            </Card>
          )}
        </aside>
      </div>
      <RateDialog order={o} open={rating} onClose={() => setRating(false)} />
      <ReportDialog open={reporting} onClose={() => setReporting(false)} target={{ type: 'ORDER', id: o.id, name: `Pedido #${o.number} de ${o.store.name}` }} />
    </div>
  );
}
