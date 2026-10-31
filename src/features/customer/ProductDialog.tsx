import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Dialog, Field, Stepper, Textarea, Thumb, cn } from '../../ds';
import { money } from '../../lib/format';
import type { Product } from '../../lib/types';
import { unitPrice } from './cart';

/** Escolher opções, quantidade e observação, e pôr na sacola */
export function ProductDialog({ product, open, onClose, onAdd, disabled }: { product: Product | null; open: boolean; onClose: () => void; onAdd: (chosen: Record<string, string[]>, qty: number, notes: string) => void; disabled?: string | null }) {
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!product) return;
    // grupos de escolha única e obrigatória já vêm com a primeira opção marcada
    setChosen(Object.fromEntries(product.optionGroups.map((g) => [g.id, g.min === 1 && g.max === 1 && g.options[0] ? [g.options[0].id] : []])));
    setQty(1);
    setNotes('');
  }, [product]);

  const missing = useMemo(() => product?.optionGroups.find((g) => (chosen[g.id]?.length ?? 0) < g.min) ?? null, [product, chosen]);
  if (!product) return null;
  const unit = unitPrice(product, chosen);

  const toggle = (gid: string, oid: string, single: boolean, max: number) =>
    setChosen((c) => {
      const cur = c[gid] ?? [];
      if (single) return { ...c, [gid]: [oid] };
      if (cur.includes(oid)) return { ...c, [gid]: cur.filter((x) => x !== oid) };
      return cur.length >= max ? c : { ...c, [gid]: [...cur, oid] };
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product.name}
      size="md"
      footerFull
      footer={
        <div className="col-span-full flex w-full min-w-0 items-center gap-3 sm:gap-4">
          <Stepper value={qty} onChange={setQty} min={1} />
          <Button full className="min-w-0 flex-1 justify-between gap-3 px-5" disabled={!!missing || !!disabled || !product.available} onClick={() => onAdd(chosen, qty, notes.trim())}>
            {disabled ?? (!product.available ? 'Esgotado' : missing ? `Escolha: ${missing.name}` : (
              <>
                <span>Adicionar</span>
                <span className="tabular-nums">{money(unit * qty)}</span>
              </>
            ))}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        {product.photoUrl && <Thumb src={product.photoUrl} name={product.name} className="aspect-[4/3] w-full" />}
        {product.description && <p className="text-text">{product.description}</p>}
        <strong className="text-xl text-ink tabular-nums">{money(product.priceCents)}</strong>
        {product.optionGroups.map((g) => {
          const single = g.max === 1;
          const picked = chosen[g.id] ?? [];
          return (
            <fieldset key={g.id} className="grid gap-1">
              <legend className="mb-1 flex w-full items-baseline justify-between gap-2 rounded-field bg-field px-3 py-2.5">
                <strong className="text-ink">{g.name}</strong>
                <span className={cn('text-[13px]', g.min > 0 && picked.length < g.min ? 'font-bold text-primary-text' : 'text-muted')}>
                  {g.min > 0 ? 'Obrigatório' : single ? 'Opcional' : `Até ${g.max}`}
                </span>
              </legend>
              {g.options.map((o) =>
                single ? (
                  <label key={o.id} className="flex cursor-pointer items-center gap-3 border-b border-line px-1 py-3 last:border-0">
                    <input type="radio" name={g.id} checked={picked.includes(o.id)} onChange={() => toggle(g.id, o.id, true, 1)} className="size-5 accent-primary" />
                    <span className="flex-1 text-ink">{o.name}</span>
                    {o.priceCents > 0 && <span className="text-sm text-muted tabular-nums">+ {money(o.priceCents)}</span>}
                  </label>
                ) : (
                  <div key={o.id} className="flex items-center gap-3 border-b border-line px-1 py-2 last:border-0">
                    <Checkbox className="flex-1" label={o.name} checked={picked.includes(o.id)} disabled={!picked.includes(o.id) && picked.length >= g.max} onChange={() => toggle(g.id, o.id, false, g.max)} />
                    {o.priceCents > 0 && <span className="text-sm text-muted tabular-nums">+ {money(o.priceCents)}</span>}
                  </div>
                ),
              )}
            </fieldset>
          );
        })}
        <Field label="Alguma observação?" optional>
          {(p) => <Textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Sem cebola, maionese à parte…" />}
        </Field>
      </div>
    </Dialog>
  );
}
