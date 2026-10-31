import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../../lib/types';

/**
 * Sacola: itens de uma loja por vez, guardada no navegador.
 * O preço aqui é só para mostrar; quem calcula o valor final é a API.
 */
export interface CartLine {
  key: string;
  productId: string;
  name: string;
  photoUrl: string | null;
  qty: number;
  unitCents: number;
  options: { groupId: string; optionIds: string[] }[];
  optionNames: string[];
  notes?: string;
}

export interface Cart {
  storeId: string;
  storeName: string;
  deliveryFeeCents: number;
  minOrderCents: number;
  lines: CartLine[];
}

interface CartApi {
  cart: Cart | null;
  count: number;
  subtotal: number;
  add: (store: Pick<Cart, 'storeId' | 'storeName' | 'deliveryFeeCents' | 'minOrderCents'>, line: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

const KEY = 'ej.cart';
const Ctx = createContext<CartApi>(null!);
export const useCart = () => useContext(Ctx);

const load = (): Cart | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};

/** O mesmo produto com as mesmas opções e observação soma na mesma linha */
const lineKey = (l: Omit<CartLine, 'key'>) => JSON.stringify([l.productId, l.options, l.notes ?? '']);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(load);
  useEffect(() => {
    try {
      if (cart?.lines.length) localStorage.setItem(KEY, JSON.stringify(cart));
      else localStorage.removeItem(KEY);
    } catch {
      /* sem armazenamento */
    }
  }, [cart]);

  const api = useMemo<CartApi>(() => {
    const lines = cart?.lines ?? [];
    return {
      cart: lines.length ? cart : null,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.qty * l.unitCents, 0),
      add: (store, line) =>
        setCart((c) => {
          const base = c && c.storeId === store.storeId ? c : { ...store, lines: [] };
          const key = lineKey(line);
          const found = base.lines.find((l) => l.key === key);
          return { ...base, ...store, lines: found ? base.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l)) : [...base.lines, { ...line, key }] };
        }),
      setQty: (key, qty) => setCart((c) => c && { ...c, lines: qty <= 0 ? c.lines.filter((l) => l.key !== key) : c.lines.map((l) => (l.key === key ? { ...l, qty } : l)) }),
      clear: () => setCart(null),
    };
  }, [cart]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Preço unitário com as opções escolhidas */
export const unitPrice = (p: Product, chosen: Record<string, string[]>) =>
  p.priceCents + p.optionGroups.reduce((s, g) => s + (chosen[g.id] ?? []).reduce((x, id) => x + (g.options.find((o) => o.id === id)?.priceCents ?? 0), 0), 0);
