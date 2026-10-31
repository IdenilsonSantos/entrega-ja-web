import { useState } from 'react';
import { Button, Field, Input, MoneyInput, Textarea } from '../../ds';
import type { MerchantStore } from '../../lib/types';
import { LocationField, type Point } from '../shared/PinMap';

export interface StoreFormValue {
  name: string;
  description: string;
  category: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  deliveryFeeCents: number;
  minOrderCents: number;
  prepTimeMin: number;
  deliveryRadiusKm: number;
}

const CATEGORIES = ['Lanches', 'Pizza', 'Japonesa', 'Brasileira', 'Árabe', 'Italiana', 'Saudável', 'Doces', 'Açaí', 'Padaria', 'Cafés', 'Bebidas', 'Mercado', 'Farmácia'];

/** Dados da loja: usado para criar e para editar */
export function StoreForm({ initial, submitLabel, onSubmit }: { initial?: Partial<MerchantStore>; submitLabel: string; onSubmit: (v: StoreFormValue) => Promise<unknown> }) {
  const [v, setV] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    deliveryFeeCents: initial?.deliveryFeeCents ?? 599,
    minOrderCents: initial?.minOrderCents ?? 0,
    prepTimeMin: initial?.prepTimeMin ?? 30,
    deliveryRadiusKm: initial?.deliveryRadiusKm ?? 6,
  });
  const [point, setPoint] = useState<Point | null>(initial?.lat !== undefined ? { lat: initial.lat!, lng: initial.lng! } : null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const valid = v.name.trim().length >= 2 && v.category.trim().length >= 2 && v.address.trim().length >= 5 && point;

  const submit = async () => {
    if (!point) return;
    setBusy(true);
    try {
      await onSubmit({ ...v, ...point, prepTimeMin: Number(v.prepTimeMin), deliveryRadiusKm: Number(v.deliveryRadiusKm) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4">
        <h2 className="text-lg">Sobre a loja</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">{(p) => <Input {...p} value={v.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />}</Field>
          <Field label="Tipo de comida">
            {(p) => (
              <>
                <Input {...p} list="store-categories" value={v.category} onChange={(e) => set('category', e.target.value)} placeholder="Lanches, Pizza…" maxLength={40} />
                <datalist id="store-categories">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>
        <Field label="Descrição" optional hint="Aparece no topo da página da loja">
          {(p) => <Textarea {...p} value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={500} placeholder="Hambúrguer na brasa com pão de fermentação natural" />}
        </Field>
        <Field label="Telefone da loja" optional>{(p) => <Input {...p} inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 3333-0000" className="sm:max-w-xs" />}</Field>
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg">Onde fica</h2>
        <LocationField label="Endereço da loja" text={v.address} onText={(t) => set('address', t)} point={point} onPoint={setPoint} />
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg">Entrega</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Taxa de entrega" hint="Zero para entrega grátis">{(p) => <MoneyInput {...p} value={v.deliveryFeeCents} onChange={(c) => set('deliveryFeeCents', c ?? 0)} />}</Field>
          <Field label="Pedido mínimo" hint="Zero para sem mínimo">{(p) => <MoneyInput {...p} value={v.minOrderCents} onChange={(c) => set('minOrderCents', c ?? 0)} />}</Field>
          <Field label="Tempo de preparo">{(p) => <Input {...p} type="number" min={5} max={180} value={v.prepTimeMin} onChange={(e) => set('prepTimeMin', Number(e.target.value))} suffix="min" />}</Field>
          <Field label="Entrega até" hint="Distância máxima até a cliente">{(p) => <Input {...p} type="number" min={1} max={20} step={0.5} value={v.deliveryRadiusKm} onChange={(e) => set('deliveryRadiusKm', Number(e.target.value))} suffix="km" />}</Field>
        </div>
      </section>

      <Button size="lg" className="justify-self-start" loading={busy} disabled={!valid} onClick={submit}>
        {submitLabel}
      </Button>
    </div>
  );
}
