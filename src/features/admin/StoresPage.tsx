import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, DescriptionList, Drawer, EmptyState, LoadMore, PageHeader, PageLoader, SearchInput, Select, Table, Td, Th, Thumb, VirtualRows, VirtualScroller, cn, rowClass } from '../../ds';
import { api, qs } from '../../lib/api';
import { dateShort, money, STORE_ROLE, STORE_STATUS } from '../../lib/format';
import { usePaged } from '../../lib/query';
import type { StoreStatus } from '../../lib/types';
import type { AdminStore, AdminStoreDetail } from './types';
import { useAdminAction } from './useAdminAction';

function StoreDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const act = useAdminAction();
  const q = useQuery({ queryKey: ['admin', 'store', id], queryFn: () => api.get<AdminStoreDetail>(`/admin/stores/${id}`), enabled: !!id });
  const s = q.data;
  const after = (ok: boolean) => void (ok && q.refetch());
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width={640}
      title={s?.name ?? 'Loja'}
      subtitle={s && <Badge tone={STORE_STATUS[s.status].tone}>{STORE_STATUS[s.status].label}</Badge>}
      footer={
        s && (
          <>
            {s.status === 'ACTIVE' && (
              <Button variant="danger" onClick={() => act({ path: `/admin/stores/${s.id}/suspend`, title: `Suspender ${s.name}?`, description: 'A loja sai do ar na hora e a equipe vê o motivo.', reason: 'Motivo', confirmLabel: 'Suspender loja', done: 'Loja suspensa', danger: true }).then(after)}>
                Suspender
              </Button>
            )}
            {s.status === 'SUSPENDED' && <Button onClick={() => act({ path: `/admin/stores/${s.id}/reactivate`, title: `Reativar ${s.name}?`, confirmLabel: 'Reativar', done: 'Loja reativada' }).then(after)}>Reativar</Button>}
            {s.status === 'PENDING' && <Button onClick={() => act({ path: `/admin/stores/${s.id}/approve`, title: `Aprovar ${s.name}?`, confirmLabel: 'Aprovar', done: 'Loja aprovada' }).then(after)}>Aprovar</Button>}
          </>
        )
      }
    >
      {!s ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6">
          {s.statusReason && <Alert tone="danger" title="Motivo da suspensão">{s.statusReason}</Alert>}
          {s.reports > 0 && <Alert tone="warn">{s.reports} denúncia(s) sobre esta loja. <Link to="/admin/denuncias">Ver denúncias</Link></Alert>}
          <DescriptionList
            items={[
              { label: 'Tipo', value: s.category },
              { label: 'Endereço', value: s.address },
              { label: 'Telefone', value: s.phone },
              { label: 'Nota', value: s.ratingCount ? `${s.ratingAvg.toFixed(1).replace('.', ',')} (${s.ratingCount})` : 'Sem avaliações' },
              { label: 'Últimos 30 dias', value: `${s.stats30d.delivered} entregues, ${s.stats30d.lost} perdidos, ${money(s.stats30d.revenue)}` },
              { label: 'Cadastrada em', value: dateShort(s.createdAt) },
            ]}
          />
          <section className="grid gap-2">
            <h3>Equipe</h3>
            <VirtualScroller
              items={s.team}
              estimate={37}
              className="max-h-60"
              render={(m, i) => (
                <div className={cn('flex items-center justify-between gap-3 py-2 text-sm', i > 0 && 'border-t border-line')}>
                  <Link to={`/admin/contas?id=${m.userId}`}>{m.name}</Link>
                  <span className="text-muted">{STORE_ROLE[m.role]}</span>
                </div>
              )}
            />
          </section>
          <section className="grid gap-2">
            <h3>Cardápio ({s.products.length})</h3>
            <VirtualScroller
              items={s.products}
              estimate={65}
              className="max-h-[50dvh]"
              render={(p, i) => {
                const removed = p.moderation === 'REMOVED';
                return (
                  <div className={cn('flex items-center gap-3 py-2.5', i > 0 && 'border-t border-line', removed && 'opacity-70')}>
                    <Thumb src={p.photoUrl} name={p.name} className="size-11" rounded="rounded-field" />
                    <div className="grid min-w-0 flex-1">
                      <span className="truncate text-sm text-ink">{p.name}</span>
                      <span className="text-[13px] text-muted">{removed ? `Removido: ${p.moderationReason}` : money(p.priceCents)}</span>
                    </div>
                    {removed ? (
                      <Button size="sm" variant="ghost" onClick={() => act({ path: `/admin/products/${p.id}/restore`, title: `Liberar "${p.name}"?`, confirmLabel: 'Liberar', done: 'Produto liberado' }).then(after)}>
                        Liberar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => act({ path: `/admin/products/${p.id}/remove`, title: `Tirar "${p.name}" do ar?`, description: 'O produto some do cardápio e a loja não consegue reativar.', reason: 'Motivo', confirmLabel: 'Tirar do ar', done: 'Produto removido', danger: true }).then(after)}>
                        Tirar do ar
                      </Button>
                    )}
                  </div>
                );
              }}
            />
          </section>
        </div>
      )}
    </Drawer>
  );
}

export function StoresPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<StoreStatus | ''>('');
  const [q, setQ] = useState('');
  const search = useDeferredValue(q.trim());
  const path = `/admin/stores${qs({ status, q: search.length >= 2 ? search : undefined })}`;
  const list = usePaged<AdminStore>(['admin', 'stores', path], path, { limit: 40 });
  const open = (id: string) => setParams({ id });
  return (
    <>
      <PageHeader title="Lojas" />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, tipo ou dono" aria-label="Buscar loja" className="w-full max-w-sm" />
        <Select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value as StoreStatus)} className="h-11 w-auto min-w-44">
          <option value="">Todas</option>
          {(Object.keys(STORE_STATUS) as StoreStatus[]).map((s) => (
            <option key={s} value={s}>
              {STORE_STATUS[s].label}
            </option>
          ))}
        </Select>
      </div>
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={Store} title="Nenhuma loja encontrada" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Loja</Th>
                <Th>Dono</Th>
                <Th>Situação</Th>
                <Th>Agora</Th>
                <Th>Cadastro</Th>
              </tr>
            </thead>
            <VirtualRows
              items={list.items}
              colSpan={5}
              onEnd={list.loadMore}
              row={(s, m) => (
                <tr key={s.id} {...m} className={rowClass} tabIndex={0} onClick={() => open(s.id)} onKeyDown={(e) => e.key === 'Enter' && open(s.id)}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Thumb src={s.logoUrl} name={s.name} className="size-9" rounded="rounded-field" />
                      <span className="grid">
                        <strong>{s.name}</strong>
                        <span className="text-[13px] text-muted">{s.category}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>{s.owner.name}</Td>
                  <Td>
                    <Badge tone={STORE_STATUS[s.status].tone}>{STORE_STATUS[s.status].label}</Badge>
                  </Td>
                  <Td className="text-muted">{s.status === 'ACTIVE' ? (s.isOpen ? 'Aberta' : 'Fechada') : '—'}</Td>
                  <Td className="text-muted">{dateShort(s.createdAt)}</Td>
                </tr>
              )}
            />
          </Table>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="lojas" />
        </>
      )}
      <StoreDrawer id={params.get('id')} onClose={() => setParams({})} />
    </>
  );
}
