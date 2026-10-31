import { Copy, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Drawer, Field, ImagePicker, Input, MoneyInput, Select, Textarea, useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import type { MenuCategory, MenuProduct, OptionGroup } from '../../lib/types';
import { OptionGroupsEditor } from './OptionGroupsEditor';

export interface ProductDraft {
  product: MenuProduct | null;
  categoryId: string | null;
  /** duplicar: começa com os dados de outro produto */
  copyOf?: MenuProduct;
}

/** Criar ou editar produto: foto, dados, seção, disponibilidade e opções */
export function ProductEditor({ storeId, draft, categories, onClose, onSaved }: { storeId: string; draft: ProductDraft | null; categories: MenuCategory[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const src = draft?.product ?? draft?.copyOf ?? null;
  const [form, setForm] = useState({ name: '', description: '', priceCents: null as number | null, categoryId: '' as string, available: true });
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setForm({ name: src ? (draft.copyOf ? `${src.name} (cópia)` : src.name) : '', description: src?.description ?? '', priceCents: src?.priceCents ?? null, categoryId: src?.categoryId ?? draft.categoryId ?? '', available: src?.available ?? true });
    setGroups(src?.optionGroups ?? []);
    setPhoto(null);
    setError(null);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const editing = draft?.product;
  const removed = editing?.moderation === 'REMOVED';

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceCents: form.priceCents,
        categoryId: form.categoryId || null,
        available: removed ? false : form.available,
        optionGroups: groups.map((g) => ({ ...g, name: g.name.trim(), options: g.options.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim() })) })).filter((g) => g.name && g.options.length),
      };
      const saved = editing ? await api.put<MenuProduct>(`/merchant/stores/${storeId}/products/${editing.id}`, body) : await api.post<MenuProduct>(`/merchant/stores/${storeId}/products`, body);
      // foto escolhida antes de existir o produto: envia agora
      if (photo) await api.upload(`/merchant/stores/${storeId}/products/${saved.id}/photo`, photo);
      toast.success(editing ? 'Produto salvo' : 'Produto criado');
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing || !(await confirm({ title: `Apagar "${editing.name}"?`, description: 'Pedidos antigos continuam com o nome e o preço da época.', tone: 'danger', confirmLabel: 'Apagar produto' }))) return;
    await api.delete(`/merchant/stores/${storeId}/products/${editing.id}`);
    onSaved();
    onClose();
  };

  const valid = form.name.trim().length > 0 && (form.priceCents ?? 0) > 0;
  return (
    <Drawer
      open={!!draft}
      onClose={onClose}
      width={620}
      title={editing ? 'Editar produto' : draft?.copyOf ? 'Duplicar produto' : 'Novo produto'}
      footer={
        <>
          {editing && (
            <Button variant="outline" icon={Trash2} onClick={remove}>
              Apagar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!valid} onClick={save}>
            {editing ? 'Salvar produto' : 'Criar produto'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        {removed && (
          <Alert tone="danger" title="Removido pela moderação">
            {editing?.moderationReason} Corrija o que foi apontado e fale com o suporte para liberar.
          </Alert>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="grid content-start gap-2">
            <ImagePicker
              value={editing?.photoUrl ?? draft?.copyOf?.photoUrl}
              label="Foto do produto"
              onUpload={async (f) => {
                if (editing) {
                  await api.upload(`/merchant/stores/${storeId}/products/${editing.id}/photo`, f);
                  onSaved();
                } else setPhoto(f);
              }}
            />
            <span className="text-[13px] text-muted">Boa luz, sem texto por cima. Cortada em 4:3.</span>
          </div>
          <div className="grid content-start gap-4">
            <Field label="Nome">{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />}</Field>
            <Field label="Preço">{(p) => <MoneyInput {...p} key={draft?.product?.id ?? draft?.copyOf?.id ?? 'new'} value={form.priceCents} onChange={(c) => setForm({ ...form, priceCents: c })} />}</Field>
          </div>
        </div>
        <Field label="Descrição" optional>{(p) => <Textarea {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} placeholder="Ingredientes, tamanho, quantas pessoas serve" />}</Field>
        <Field label="Seção">
          {(p) => (
            <Select {...p} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Sem seção</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Checkbox label="Disponível para venda" description="Desmarque quando acabar; o produto continua no cardápio como esgotado." checked={form.available && !removed} disabled={removed} onChange={(e) => setForm({ ...form, available: e.target.checked })} />
        <section className="grid gap-3 border-t border-line pt-5">
          <div>
            <h3>Opções</h3>
            <p className="text-[13px] text-muted">Escolhas que a cliente faz ao pedir, com ou sem preço adicional.</p>
          </div>
          <OptionGroupsEditor value={groups} onChange={setGroups} />
        </section>
      </div>
    </Drawer>
  );
}

export const DuplicateIcon = Copy;
