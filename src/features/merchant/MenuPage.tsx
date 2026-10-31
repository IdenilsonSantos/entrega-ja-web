import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, EmptyState, IconButton, PageHeader, PageLoader, Switch, Thumb, VirtualList, cn, useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { MenuCategory, MenuProduct } from '../../lib/types';
import { ProductEditor, type ProductDraft } from './ProductEditor';
import { useStore } from './storeContext';

interface Menu {
  categories: MenuCategory[];
  products: MenuProduct[];
}

export function MenuPage() {
  const { store, can } = useStore();
  const edit = can('menu.edit');
  const toast = useToast();
  const confirm = useConfirm();
  const key = ['merchant', store.id, 'menu'];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Menu>(`/merchant/stores/${store.id}/menu`) });
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const base = `/merchant/stores/${store.id}`;

  const sections = useMemo(() => {
    const m = q.data;
    if (!m) return [];
    const list = m.categories.map((c) => ({ cat: c as MenuCategory | null, products: m.products.filter((p) => p.categoryId === c.id) }));
    const loose = m.products.filter((p) => !p.categoryId || !m.categories.some((c) => c.id === p.categoryId));
    if (loose.length) list.push({ cat: null, products: loose });
    return list;
  }, [q.data]);

  // seções e produtos numa lista só, virtualizada
  type Row =
    | { id: string; kind: 'section'; cat: MenuCategory | null; count: number; si: number }
    | { id: string; kind: 'empty' }
    | { id: string; kind: 'product'; p: MenuProduct; list: MenuProduct[]; i: number };
  const rows = useMemo<Row[]>(
    () =>
      sections.flatMap(({ cat, products }, si): Row[] => [
        { id: `s-${cat?.id ?? 'loose'}`, kind: 'section', cat, count: products.length, si },
        ...(products.length ? products.map((p, i): Row => ({ id: p.id, kind: 'product', p, list: products, i })) : [{ id: `e-${cat?.id ?? 'loose'}`, kind: 'empty' } as Row]),
      ]),
    [sections],
  );

  const call = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const newSection = async () => {
    const name = await confirm({ title: 'Nova seção', description: 'Ex.: Lanches, Bebidas, Sobremesas', confirmLabel: 'Criar seção', reason: { label: 'Nome da seção' } });
    if (typeof name === 'string') call(() => api.post(`${base}/categories`, { name }));
  };
  const renameSection = async (c: MenuCategory) => {
    const name = await confirm({ title: `Renomear "${c.name}"`, confirmLabel: 'Salvar', reason: { label: 'Novo nome' } });
    if (typeof name === 'string') call(() => api.patch(`${base}/categories/${c.id}`, { name }));
  };
  const deleteSection = async (c: MenuCategory) => {
    if (await confirm({ title: `Apagar a seção "${c.name}"?`, description: 'Os produtos não são apagados: ficam em "Sem seção".', tone: 'danger', confirmLabel: 'Apagar seção' })) call(() => api.delete(`${base}/categories/${c.id}`));
  };
  const moveSection = (i: number, d: -1 | 1) => {
    const ids = q.data!.categories.map((c) => c.id);
    const j = i + d;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    call(() => api.put(`${base}/categories/order`, { ids }));
  };
  const moveProduct = (list: MenuProduct[], i: number, d: -1 | 1) => {
    // reordena dentro da seção, mantendo a posição relativa dos outros produtos da loja
    const all = q.data!.products.map((p) => p.id);
    const a = all.indexOf(list[i].id);
    const b = all.indexOf(list[i + d].id);
    [all[a], all[b]] = [all[b], all[a]];
    call(() => api.put(`${base}/products/order`, { ids: all }));
  };
  const setAvailable = (p: MenuProduct, available: boolean) =>
    call(async () => {
      queryClient.setQueryData<Menu>(key, (m) => m && { ...m, products: m.products.map((x) => (x.id === p.id ? { ...x, available } : x)) });
      await api.post(`${base}/products/${p.id}/availability`, { available });
    });

  if (q.isLoading) return <PageLoader />;
  const empty = !q.data?.products.length && !q.data?.categories.length;

  return (
    <>
      <PageHeader
        title="Cardápio"
        description={edit ? 'Organize as seções, edite produtos e marque o que acabou.' : 'Marque o que acabou. Para editar produtos, fale com o gerente.'}
        actions={
          edit && (
            <>
              <Button variant="outline" icon={Plus} onClick={newSection}>
                Seção
              </Button>
              <Button icon={Plus} onClick={() => setDraft({ product: null, categoryId: q.data?.categories[0]?.id ?? null })}>
                Produto
              </Button>
            </>
          )
        }
      />
      {empty ? (
        <EmptyState icon={UtensilsCrossed} title="Cardápio vazio" description="Comece criando as seções (Lanches, Bebidas…) e depois os produtos." action={edit && <Button onClick={newSection}>Criar primeira seção</Button>} />
      ) : (
        <VirtualList
          items={rows}
          estimate={88}
          render={(r) => {
            if (r.kind === 'empty') return <p className="py-4 text-sm text-muted">Nenhum produto nesta seção.</p>;
            if (r.kind === 'section') {
              const { cat, si } = r;
              return (
                <header className={cn('mb-1 flex flex-wrap items-center gap-x-1 gap-y-1 border-b-2 border-ink pb-2', si > 0 && 'mt-8')}>
                  <h2 className="min-w-0 flex-1 basis-40 truncate text-lg">
                    {cat?.name ?? 'Sem seção'} <span className="text-sm font-normal text-muted">{r.count}</span>
                  </h2>
                  {edit && cat && (
                    <div className="flex items-center">
                      <IconButton icon={ArrowUp} label="Subir seção" variant="ghost" size="sm" disabled={si === 0} onClick={() => moveSection(si, -1)} />
                      <IconButton icon={ArrowDown} label="Descer seção" variant="ghost" size="sm" disabled={si >= q.data!.categories.length - 1} onClick={() => moveSection(si, 1)} />
                      <IconButton icon={Pencil} label="Renomear seção" variant="ghost" size="sm" onClick={() => renameSection(cat)} />
                      <IconButton icon={Trash2} label="Apagar seção" variant="ghost" size="sm" onClick={() => deleteSection(cat)} />
                      <Button variant="ghost" size="sm" icon={Plus} onClick={() => setDraft({ product: null, categoryId: cat.id })}>
                        Produto
                      </Button>
                    </div>
                  )}
                </header>
              );
            }
            const { p, list, i } = r;
            const removed = p.moderation === 'REMOVED';
            return (
              <div className={cn('flex items-center gap-3 border-b border-line py-3 sm:gap-4', !p.available && 'opacity-70')}>
                <Thumb src={p.photoUrl} name={p.name} className="size-14 sm:size-16" />
                <button type="button" className="grid min-w-0 flex-1 text-left disabled:cursor-default" disabled={!edit} onClick={() => setDraft({ product: p, categoryId: p.categoryId })}>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <strong className="text-ink">{p.name}</strong>
                    {removed && <Badge tone="danger">Removido pela moderação</Badge>}
                    {p.optionGroups.length > 0 && <span className="text-[13px] text-muted">{p.optionGroups.length} grupo(s) de opções</span>}
                  </span>
                  {p.description && <span className="truncate text-[13px] text-muted">{p.description}</span>}
                  <span className="text-sm font-bold text-ink tabular-nums">{money(p.priceCents)}</span>
                </button>
                <Switch
                  className="shrink-0"
                  checked={p.available && !removed}
                  disabled={removed}
                  onChange={(v) => setAvailable(p, v)}
                  label={
                    <>
                      <span className="sr-only">{p.name}: </span>
                      <span className="sr-only text-sm sm:not-sr-only">{p.available && !removed ? 'Disponível' : 'Esgotado'}</span>
                    </>
                  }
                />
                {edit && (
                  <div className="hidden items-center sm:flex">
                    <IconButton icon={ArrowUp} label="Subir" variant="ghost" size="sm" disabled={i === 0} onClick={() => moveProduct(list, i, -1)} />
                    <IconButton icon={ArrowDown} label="Descer" variant="ghost" size="sm" disabled={i === list.length - 1} onClick={() => moveProduct(list, i, 1)} />
                    <IconButton icon={Copy} label="Duplicar" variant="ghost" size="sm" onClick={() => setDraft({ product: null, categoryId: p.categoryId, copyOf: p })} />
                  </div>
                )}
              </div>
            );
          }}
        />
      )}
      <ProductEditor storeId={store.id} draft={draft} categories={q.data?.categories ?? []} onClose={() => setDraft(null)} onSaved={refresh} />
    </>
  );
}
