import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Badge, Button, DescriptionList, Drawer, EmptyState, LiveDot, LoadMore, PageHeader, PageLoader, SearchInput, Select, Table, Td, Th, VirtualRows, VirtualScroller, cn, rowClass } from '../../ds';
import { api, qs } from '../../lib/api';
import { dateShort, money, ROLE, STORE_ROLE, USER_STATUS, VEHICLE } from '../../lib/format';
import { usePaged } from '../../lib/query';
import type { Role, UserStatus } from '../../lib/types';
import { Plate } from '../shared/Plate';
import type { AdminUser, AdminUserDetail } from './types';
import { useAdminAction } from './useAdminAction';

function UserDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const act = useAdminAction();
  const q = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`), enabled: !!id });
  const u = q.data;
  const after = (ok: boolean) => void (ok && q.refetch());
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={u?.name ?? 'Conta'}
      subtitle={u && <span className="flex gap-2"><Badge tone="primary">{ROLE[u.role]}</Badge><Badge tone={USER_STATUS[u.status].tone}>{USER_STATUS[u.status].label}</Badge></span>}
      footer={
        u &&
        u.role !== 'ADMIN' && (
          <>
            {u.status === 'PENDING' && u.role === 'COURIER' && <Button onClick={() => act({ path: `/admin/users/${u.id}/approve`, title: `Aprovar ${u.name}?`, confirmLabel: 'Aprovar', done: 'Entregador aprovado' }).then(after)}>Aprovar</Button>}
            {u.status === 'BLOCKED' ? (
              <Button onClick={() => act({ path: `/admin/users/${u.id}/unblock`, title: `Desbloquear ${u.name}?`, confirmLabel: 'Desbloquear', done: 'Conta liberada' }).then(after)}>Desbloquear</Button>
            ) : (
              <Button variant="danger" onClick={() => act({ path: `/admin/users/${u.id}/block`, title: `Bloquear ${u.name}?`, description: 'A pessoa sai do app na hora e vê o motivo ao tentar entrar.', reason: 'Motivo', confirmLabel: 'Bloquear conta', done: 'Conta bloqueada', danger: true }).then(after)}>
                Bloquear
              </Button>
            )}
          </>
        )
      }
    >
      {!u ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} src={u.avatarUrl} size={56} />
            <div className="grid">
              <span className="text-ink">{u.email}</span>
              <span className="text-sm text-muted">{u.phone ?? 'Sem telefone'}</span>
            </div>
          </div>
          {u.statusReason && <Alert tone={u.status === 'BLOCKED' ? 'danger' : 'warn'}>{u.statusReason}</Alert>}
          {u.reports > 0 && <Alert tone="warn">{u.reports} denúncia(s) sobre esta conta.</Alert>}
          <DescriptionList
            items={[
              { label: 'Conta criada', value: dateShort(u.createdAt) },
              { label: 'Pedidos como cliente', value: u.orders.asCustomer },
              ...(u.role === 'COURIER' ? [{ label: 'Entregas', value: u.orders.asCourier }, { label: 'Ganhos (total)', value: money(u.earnings?.total ?? 0) }, { label: 'Agora', value: <span className="flex items-center gap-2"><LiveDot on={!!u.online} />{u.online ? 'Online' : 'Offline'}</span> }] : []),
            ]}
          />
          {u.courier && (
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <h3>Veículo e documentos</h3>
                {u.courier.vehiclePlate && <Plate plate={u.courier.vehiclePlate} />}
              </div>
              <DescriptionList
                items={[
                  { label: 'Veículo', value: [VEHICLE[u.courier.vehicleType], u.courier.vehicleModel, u.courier.vehicleColor].filter(Boolean).join(', ') },
                  { label: 'CPF', value: u.courier.document },
                  { label: 'CNH', value: u.courier.licenseNumber },
                  { label: 'Pix', value: u.courier.pixKey },
                ]}
              />
            </section>
          )}
          {u.stores && (
            <section className="grid gap-2">
              <h3>Lojas</h3>
              <VirtualScroller
                items={u.stores}
                estimate={37}
                className="max-h-60"
                render={(s, i) => (
                  <div className={cn('flex justify-between py-2 text-sm', i > 0 && 'border-t border-line')}>
                    <Link to={`/admin/lojas?id=${s.id}`}>{s.name}</Link>
                    <span className="text-muted">{STORE_ROLE[s.role]}</span>
                  </div>
                )}
              />
              {!u.stores.length && <p className="py-2 text-sm text-muted">Nenhuma loja</p>}
            </section>
          )}
          <Link to={`/admin/pedidos`} className="text-sm font-bold">
            Ver pedidos
          </Link>
        </div>
      )}
    </Drawer>
  );
}

export function UsersPage({ role: fixedRole, title }: { role?: Role; title: string }) {
  const [params, setParams] = useSearchParams();
  const [role, setRole] = useState<Role | ''>(fixedRole ?? '');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [q, setQ] = useState('');
  const search = useDeferredValue(q.trim());
  const path = `/admin/users${qs({ role: fixedRole ?? role, status, q: search.length >= 2 ? search : undefined })}`;
  const list = usePaged<AdminUser>(['admin', 'users', path], path, { limit: 40 });
  const open = (id: string) => setParams({ id });
  return (
    <>
      <PageHeader title={title} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou e-mail" aria-label="Buscar conta" className="w-full max-w-sm" />
        {!fixedRole && (
          <Select aria-label="Tipo" value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-11 w-auto min-w-40">
            <option value="">Todos os tipos</option>
            {(Object.keys(ROLE) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE[r]}
              </option>
            ))}
          </Select>
        )}
        <Select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} className="h-11 w-auto min-w-40">
          <option value="">Todas as situações</option>
          {(Object.keys(USER_STATUS) as UserStatus[]).map((s) => (
            <option key={s} value={s}>
              {USER_STATUS[s].label}
            </option>
          ))}
        </Select>
      </div>
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={Users} title="Nenhuma conta encontrada" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                {!fixedRole && <Th>Tipo</Th>}
                <Th>Situação</Th>
                <Th>Desde</Th>
              </tr>
            </thead>
            <VirtualRows
              items={list.items}
              colSpan={fixedRole ? 4 : 5}
              onEnd={list.loadMore}
              row={(u, m) => (
                <tr key={u.id} {...m} className={rowClass} tabIndex={0} onClick={() => open(u.id)} onKeyDown={(e) => e.key === 'Enter' && open(u.id)}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatarUrl} size={32} />
                      <strong>{u.name}</strong>
                      {u.online && <LiveDot />}
                    </span>
                  </Td>
                  <Td className="text-muted">{u.email}</Td>
                  {!fixedRole && <Td>{ROLE[u.role]}</Td>}
                  <Td>
                    <Badge tone={USER_STATUS[u.status].tone}>{USER_STATUS[u.status].label}</Badge>
                  </Td>
                  <Td className="text-muted">{dateShort(u.createdAt)}</Td>
                </tr>
              )}
            />
          </Table>
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="contas" />
        </>
      )}
      <UserDrawer id={params.get('id')} onClose={() => setParams({})} />
    </>
  );
}
