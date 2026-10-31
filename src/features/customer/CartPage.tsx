import { Banknote, CreditCard, MapPin, QrCode, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, buttonClass, Card, EmptyState, Field, MoneyInput, OptionCard, Stepper, Textarea, Thumb, useToast } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { Order, PaymentMethod } from '../../lib/types';
import { useCart } from './cart';
import { AddressPicker } from './CustomerShell';
import { useDelivery } from './location';

const PAY: { value: PaymentMethod; label: string; description: string; icon: typeof QrCode }[] = [
  { value: 'PIX', label: 'Pix', description: 'O entregador mostra o QR code', icon: QrCode },
  { value: 'CARD', label: 'Cartão', description: 'Crédito ou débito na maquininha', icon: CreditCard },
  { value: 'CASH', label: 'Dinheiro', description: 'Diga se precisa de troco', icon: Banknote },
];

export function CartPage() {
  const { me } = useAuth();
  const { cart, subtotal, setQty, clear } = useCart();
  const { place } = useDelivery();
  const navigate = useNavigate();
  const toast = useToast();
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [change, setChange] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cart)
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Sua sacola está vazia"
        description="Escolha uma loja e adicione os itens que quiser."
        action={
          <Link to="/" className={buttonClass()}>
            Ver lojas
          </Link>
        }
      />
    );

  const total = subtotal + cart.deliveryFeeCents;
  const belowMin = subtotal < cart.minOrderCents;

  const place_ = async () => {
    if (!me) return navigate('/entrar?voltar=/sacola');
    setBusy(true);
    setError(null);
    try {
      const order = await api.post<Order>('/orders', {
        storeId: cart.storeId,
        items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty, options: l.options, notes: l.notes })),
        ...(place.address ? { addressId: place.address.id } : { deliveryAddress: place.label, deliveryLat: place.lat, deliveryLng: place.lng }),
        paymentMethod: payment,
        changeForCents: payment === 'CASH' && change ? change : undefined,
        notes: notes.trim() || undefined,
      });
      clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido enviado', `${cart.storeName} vai confirmar em instantes.`);
      navigate(`/pedidos/${order.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="grid gap-8">
        <section>
          <h1 className="mb-1">Sacola</h1>
          <Link to={`/lojas/${cart.storeId}`} className="text-sm font-bold">
            {cart.storeName}, adicionar mais itens
          </Link>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {cart.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-4 py-4">
                {l.photoUrl && <Thumb src={l.photoUrl} name={l.name} className="size-16" />}
                <div className="grid min-w-0 flex-1">
                  <strong className="text-ink">{l.name}</strong>
                  {l.optionNames.length > 0 && <span className="text-[13px] text-muted">{l.optionNames.join(', ')}</span>}
                  {l.notes && <span className="text-[13px] text-warn">Obs.: {l.notes}</span>}
                  <span className="mt-1 text-sm font-bold text-ink tabular-nums">{money(l.unitCents * l.qty)}</span>
                </div>
                <Stepper size="sm" value={l.qty} onChange={(q) => setQty(l.key, q)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg">Entrega</h2>
          <button type="button" onClick={() => setPicking(true)} className="flex items-start gap-3 rounded-card border border-line p-4 text-left hover:border-subtle">
            <MapPin size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <span className="grid min-w-0 flex-1">
              <strong className="text-ink">{place.address?.label ?? 'Ponto no mapa'}</strong>
              <span className="text-sm text-muted">
                {place.address ? [place.address.street, place.address.complement].filter(Boolean).join(', ') : place.label}
              </span>
            </span>
            <span className="text-sm font-bold text-primary-text">Trocar</span>
          </button>
          {!place.address && <Alert tone="warn">Escolha um endereço salvo para o entregador ter número e complemento.</Alert>}
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg">Pagamento na entrega</h2>
          <div className="grid gap-2">
            {PAY.map((p) => (
              <OptionCard key={p.value} name="pay" checked={payment === p.value} onChange={() => setPayment(p.value)} label={p.label} description={p.description} icon={<p.icon size={22} className="shrink-0 text-ink" aria-hidden />} />
            ))}
          </div>
          {payment === 'CASH' && (
            <Field label="Troco para quanto?" optional hint="Deixe vazio se não precisar de troco">
              {(p) => <MoneyInput {...p} value={change} onChange={setChange} />}
            </Field>
          )}
          <Field label="Observação para a loja" optional>
            {(p) => <Textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Interfone quebrado, ligar ao chegar" />}
          </Field>
        </section>
      </div>

      <Card className="grid gap-4 lg:sticky lg:top-24">
        <h2 className="text-lg">Resumo</h2>
        <div className="grid gap-1.5 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Entrega</span>
            <span className="tabular-nums">{cart.deliveryFeeCents ? money(cart.deliveryFeeCents) : 'Grátis'}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-lg font-bold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{money(total)}</span>
          </div>
        </div>
        {belowMin && <Alert tone="warn">Pedido mínimo da loja: {money(cart.minOrderCents)}. Faltam {money(cart.minOrderCents - subtotal)}.</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}
        <Button size="lg" full loading={busy} disabled={belowMin} onClick={place_}>
          {me ? `Fazer pedido de ${money(total)}` : 'Entrar para pedir'}
        </Button>
      </Card>
      <AddressPicker open={picking} onClose={() => setPicking(false)} />
    </div>
  );
}
