import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bike, Clock, Flag, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, EmptyState, IconButton, PageLoader, Rating, Thumb, VirtualList, cn, useConfirm, useToast, type VirtualListHandle } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import type { Product, StoreDetail } from '../../lib/types';
import { ReportDialog } from '../shared/ReportDialog';
import { unitPrice, useCart } from './cart';
import { ProductDialog } from './ProductDialog';

/** Produto no cardápio: texto à esquerda, foto à direita (o padrão que a cliente já conhece) */
function ProductRow({ p, last, onOpen }: { p: Product; last: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={cn('flex w-full items-start gap-4 py-4 text-left', !last && 'border-b border-line', !p.available && 'opacity-55')}>
      <span className="grid min-w-0 flex-1 gap-1">
        <strong className="text-[15px] text-ink">{p.name}</strong>
        {p.description && <span className="line-clamp-2 text-[13px] text-muted">{p.description}</span>}
        <span className="mt-1 text-[15px] font-bold text-ink tabular-nums">{p.available ? money(p.priceCents) : 'Esgotado'}</span>
      </span>
      {p.photoUrl && <Thumb src={p.photoUrl} name={p.name} className="size-[96px] sm:size-[112px]" />}
    </button>
  );
}

/** Altura do que fica fixo no topo enquanto rola (cabeçalho do site + abas das seções) */
const STICKY = 64 + 48;

type MenuRow = { id: string; section: string; name: string } | { id: string; section: string; product: Product; last: boolean };

/**
 * Cardápio virtualizado (só os itens perto da tela ficam no DOM), com abas das seções que
 * acompanham a rolagem e levam até a seção. Só aparecem seções com produtos.
 */
function Menu({ sections, onOpen }: { sections: StoreDetail['sections']; onOpen: (p: Product) => void }) {
  const rows = useMemo<MenuRow[]>(
    () => sections.flatMap((sec) => [{ id: `s-${sec.id}`, section: sec.id, name: sec.name }, ...sec.products.map((p, i) => ({ id: p.id, section: sec.id, product: p, last: i === sec.products.length - 1 }))]),
    [sections],
  );
  const list = useRef<VirtualListHandle>(null);
  const tabs = useRef<HTMLElement>(null);
  const [active, setActive] = useState(sections[0]?.id);
  // durante a rolagem suave depois de um toque na aba, a aba tocada manda
  const lockUntil = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (Date.now() < lockUntil.current || !list.current) return;
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setActive(atBottom ? sections[sections.length - 1]?.id : rows[list.current.indexAt(STICKY + 8)]?.section);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => (window.removeEventListener('scroll', onScroll), cancelAnimationFrame(frame));
  }, [rows, sections]);

  // a aba ativa fica visível na barra (rolagem horizontal no celular)
  useEffect(() => {
    tabs.current?.querySelector<HTMLElement>(`[data-section="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const go = (sectionId: string) => {
    setActive(sectionId);
    lockUntil.current = Date.now() + 900;
    list.current?.scrollTo(rows.findIndex((r) => r.id === `s-${sectionId}`), STICKY);
  };

  return (
    <>
      {sections.length > 1 && (
        <nav ref={tabs} aria-label="Seções do cardápio" className="scrollbar-none sticky top-16 z-20 -mx-4 mt-6 flex h-12 gap-5 overflow-x-auto border-b border-line bg-bg px-4 sm:mx-0 sm:px-0">
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              data-section={sec.id}
              aria-current={active === sec.id ? 'true' : undefined}
              onClick={() => go(sec.id)}
              className={cn('-mb-px shrink-0 border-b-2 text-sm font-bold transition', active === sec.id ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink')}
            >
              {sec.name}
            </button>
          ))}
        </nav>
      )}
      <VirtualList
        handle={list}
        items={rows}
        estimate={92}
        className="max-w-3xl"
        render={(r) => ('product' in r ? <ProductRow p={r.product} last={r.last} onOpen={() => onOpen(r.product)} /> : <h2 className="pt-6 pb-1 text-lg">{r.name}</h2>)}
      />
    </>
  );
}

export function StorePage() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const cart = useCart();
  const [open, setOpen] = useState<Product | null>(null);
  const [reporting, setReporting] = useState(false);
  const store = useQuery({ queryKey: ['store', id], queryFn: () => api.get<StoreDetail>(`/stores/${id}`) });

  if (store.isLoading) return <PageLoader />;
  if (!store.data) return <EmptyState icon={ShoppingBag} title="Loja não encontrada" action={<Link to="/">Ver outras lojas</Link>} />;
  const s = store.data;
  const inThisCart = cart.cart?.storeId === s.id;

  const add = async (p: Product, chosen: Record<string, string[]>, qty: number, notes: string) => {
    if (cart.cart && !inThisCart) {
      const ok = await confirm({ title: 'Começar uma sacola nova?', description: `Sua sacola tem itens de ${cart.cart.storeName}. Cada pedido é de uma loja só.`, confirmLabel: 'Esvaziar e adicionar' });
      if (!ok) return;
      cart.clear();
    }
    const names = p.optionGroups.flatMap((g) => (chosen[g.id] ?? []).map((oid) => g.options.find((o) => o.id === oid)?.name ?? ''));
    cart.add(
      { storeId: s.id, storeName: s.name, deliveryFeeCents: s.deliveryFeeCents, minOrderCents: s.minOrderCents },
      { productId: p.id, name: p.name, photoUrl: p.photoUrl, qty, unitCents: unitPrice(p, chosen), options: Object.entries(chosen).filter(([, v]) => v.length).map(([groupId, optionIds]) => ({ groupId, optionIds })), optionNames: names, notes: notes || undefined },
    );
    setOpen(null);
    toast.success(`${qty}× ${p.name} na sacola`);
  };

  return (
    <div className="-mx-4 -mt-5 sm:mx-0 sm:mt-0">
      <div className="relative">
        {s.coverUrl ? <Thumb src={s.coverUrl} name={s.name} rounded="sm:rounded-card" className="aspect-[18/7] max-h-[300px] w-full" /> : <div className="h-28 bg-navy sm:rounded-card" />}
        <IconButton icon={ArrowLeft} label="Voltar" onClick={() => navigate(-1)} className="absolute top-3 left-3 bg-bg/90 backdrop-blur" />
      </div>

      <div className="px-4 sm:px-0">
        <div className="relative z-10 -mt-10 mb-5 flex items-end gap-4">
          <Thumb src={s.logoUrl} name={s.name} className="size-20 border-4 border-bg text-3xl" />
          <div className="flex-1" />
          <Button variant="ghost" size="sm" icon={Flag} onClick={() => (me ? setReporting(true) : navigate('/entrar'))}>
            Denunciar
          </Button>
        </div>
        <h1 className="text-[30px]">{s.name}</h1>
        {s.description && <p className="mt-1 max-w-2xl text-text">{s.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-text">
          <Rating value={s.ratingAvg} count={s.ratingCount} />
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} aria-hidden /> {s.prepTimeMin}–{s.prepTimeMin + 15} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bike size={15} aria-hidden /> {s.deliveryFeeCents ? money(s.deliveryFeeCents) : 'Entrega grátis'}
          </span>
          {s.minOrderCents > 0 && <span>Pedido mínimo {money(s.minOrderCents)}</span>}
        </div>
        {!s.isOpen && (
          <Alert tone="warn" className="mt-4">
            A loja está fechada agora. Você pode ver o cardápio, mas não dá para pedir.
          </Alert>
        )}

        <Menu sections={s.sections} onOpen={setOpen} />
        {/* espaço para a barra da sacola não cobrir o último produto */}
        {inThisCart && <div className="h-20" aria-hidden />}
      </div>

      {inThisCart && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 pb-3 sm:bottom-0 sm:pb-5">
          <Link to="/sacola" className="mx-auto flex h-14 max-w-xl items-center gap-3 rounded-btn bg-primary px-5 font-bold text-white no-underline shadow-pop">
            <ShoppingBag size={20} aria-hidden />
            <span className="flex-1">Ver sacola ({cart.count})</span>
            <span className="tabular-nums">{money(cart.subtotal)}</span>
          </Link>
        </div>
      )}

      <ProductDialog product={open} open={!!open} onClose={() => setOpen(null)} disabled={s.isOpen ? null : 'Loja fechada'} onAdd={(c, q, n) => open && add(open, c, q, n)} />
      <ReportDialog open={reporting} onClose={() => setReporting(false)} target={{ type: 'STORE', id: s.id, name: s.name }} />
    </div>
  );
}
