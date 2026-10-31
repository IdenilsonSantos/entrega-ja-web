import { useQuery } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader, IconButton, VirtualList, cn, useConfirm } from '../../ds';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/query';
import type { Address } from '../../lib/types';
import { AccountPage } from '../shared/AccountPage';
import { AddressDialog } from './AddressDialog';

function Addresses() {
  const list = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });
  const [editing, setEditing] = useState<Address | null | undefined>(undefined);
  const confirm = useConfirm();
  const remove = async (a: Address) => {
    if (!(await confirm({ title: `Apagar "${a.label}"?`, confirmLabel: 'Apagar', tone: 'danger' }))) return;
    await api.delete(`/addresses/${a.id}`);
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
  };
  return (
    <Card>
      <CardHeader title="Endereços" action={<Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing(null)}>Novo</Button>} />
      <VirtualList
        items={list.data ?? []}
        estimate={65}
        render={(a, i) => (
          <div className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t border-line')}>
            <MapPin size={18} className="shrink-0 text-muted" aria-hidden />
            <div className="grid min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <strong className="text-ink">{a.label}</strong>
                {a.isDefault && <Badge tone="primary">Principal</Badge>}
              </span>
              <span className="truncate text-sm text-muted">{[a.street, a.complement].filter(Boolean).join(', ')}</span>
            </div>
            <IconButton icon={Pencil} label="Editar" variant="ghost" size="sm" onClick={() => setEditing(a)} />
            <IconButton icon={Trash2} label="Apagar" variant="ghost" size="sm" onClick={() => remove(a)} />
          </div>
        )}
      />
      {list.data?.length === 0 && <p className="py-3 text-sm text-muted">Nenhum endereço salvo.</p>}
      <AddressDialog open={editing !== undefined} address={editing} onClose={() => setEditing(undefined)} />
    </Card>
  );
}

export function CustomerAccount() {
  return <AccountPage extra={<Addresses />} />;
}
