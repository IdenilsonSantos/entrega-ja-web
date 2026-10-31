import { useQuery } from '@tanstack/react-query';
import { CheckCheck } from 'lucide-react';
import { Badge, Button, ButtonRow, Card, DescriptionList, EmptyState, PageHeader, PageLoader, Thumb, VirtualList } from '../../ds';
import { api } from '../../lib/api';
import { dateTime, money, VEHICLE } from '../../lib/format';
import { chunk, useMedia } from '../../lib/useMedia';
import type { CourierProfile, User } from '../../lib/types';
import { Plate } from '../shared/Plate';
import type { AdminStore } from './types';
import { useAdminAction } from './useAdminAction';

interface Approvals {
  stores: (AdminStore & { description: string | null; deliveryFeeCents: number; prepTimeMin: number })[];
  couriers: (User & { courier: CourierProfile | null })[];
}

const cpf = (d: string | null) => (d ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—');

export function ApprovalsPage() {
  const q = useQuery({ queryKey: ['admin', 'approvals'], queryFn: () => api.get<Approvals>('/admin/approvals') });
  const act = useAdminAction();
  // dois cards por linha a partir de 1024px (lg); hook antes do retorno antecipado
  const cols = useMedia('(min-width: 1024px)') ? 2 : 1;
  if (!q.data) return <PageLoader />;
  const { stores, couriers } = q.data;
  return (
    <>
      <PageHeader title="Aprovações" description="Confira os dados antes de liberar lojas e entregadores." />
      {!stores.length && !couriers.length && <EmptyState icon={CheckCheck} title="Nada esperando aprovação" />}
      {stores.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg">Lojas ({stores.length})</h2>
          <VirtualList
            items={chunk(stores, cols)}
            estimate={320}
            render={(row) => (
              <div className="grid gap-4 pb-4 lg:grid-cols-2">
                {row.items.map((s) => (
              <Card key={s.id} className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Thumb src={s.logoUrl} name={s.name} className="size-14" />
                  <div className="grid flex-1">
                    <strong className="text-lg text-ink">{s.name}</strong>
                    <span className="text-sm text-muted">
                      {s.category}, cadastrada em {dateTime(s.createdAt)}
                    </span>
                  </div>
                </div>
                {s.description && <p className="text-sm">{s.description}</p>}
                <DescriptionList
                  items={[
                    { label: 'Endereço', value: s.address },
                    { label: 'Telefone', value: s.phone },
                    { label: 'Dono', value: `${s.owner.name} (${s.owner.email})` },
                    { label: 'Taxa e preparo', value: `${money(s.deliveryFeeCents)}, ${s.prepTimeMin} min` },
                  ]}
                />
                <ButtonRow>
                  <Button onClick={() => act({ path: `/admin/stores/${s.id}/approve`, title: `Aprovar ${s.name}?`, description: 'A equipe da loja é avisada e já pode abrir.', confirmLabel: 'Aprovar loja', done: 'Loja aprovada' })}>Aprovar</Button>
                  <Button variant="outline" onClick={() => act({ path: `/admin/stores/${s.id}/suspend`, title: `Recusar ${s.name}?`, description: 'A loja fica suspensa e a equipe vê o motivo.', reason: 'O que precisa mudar', confirmLabel: 'Recusar', done: 'Loja recusada', danger: true })}>
                    Recusar
                  </Button>
                </ButtonRow>
              </Card>
                ))}
              </div>
            )}
          />
        </section>
      )}
      {couriers.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">Entregadores ({couriers.length})</h2>
          <VirtualList
            items={chunk(couriers, cols)}
            estimate={320}
            render={(row) => (
              <div className="grid gap-4 pb-4 lg:grid-cols-2">
                {row.items.map((c) => (
              <Card key={c.id} className="grid gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid">
                    <strong className="text-lg text-ink">{c.name}</strong>
                    <span className="text-sm text-muted">
                      {c.email}, {c.phone ?? 'sem telefone'}
                    </span>
                  </div>
                  {c.courier?.vehiclePlate && <Plate plate={c.courier.vehiclePlate} />}
                </div>
                {c.statusReason && <Badge tone="warn">Ajuste pedido: {c.statusReason}</Badge>}
                <DescriptionList
                  items={[
                    { label: 'Veículo', value: c.courier ? [VEHICLE[c.courier.vehicleType], c.courier.vehicleModel, c.courier.vehicleColor].filter(Boolean).join(', ') : '—' },
                    { label: 'CPF', value: cpf(c.courier?.document ?? null) },
                    { label: 'CNH', value: c.courier?.licenseNumber },
                    { label: 'Pix', value: c.courier?.pixKey },
                  ]}
                />
                <ButtonRow>
                  <Button onClick={() => act({ path: `/admin/users/${c.id}/approve`, title: `Aprovar ${c.name}?`, description: 'A pessoa é avisada e já pode ficar online.', confirmLabel: 'Aprovar', done: 'Entregador aprovado' })}>Aprovar</Button>
                  <Button variant="outline" onClick={() => act({ path: `/admin/users/${c.id}/request-changes`, title: `Pedir ajuste a ${c.name}`, description: 'O cadastro continua em análise e a pessoa vê o que corrigir.', reason: 'O que precisa corrigir', confirmLabel: 'Enviar pedido', done: 'Pedido de ajuste enviado' })}>
                    Pedir ajuste
                  </Button>
                </ButtonRow>
              </Card>
                ))}
              </div>
            )}
          />
        </section>
      )}
    </>
  );
}
