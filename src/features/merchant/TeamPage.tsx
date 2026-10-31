import { useQuery } from '@tanstack/react-query';
import { Copy, Crown, Link2, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Card, Dialog, Field, IconButton, Input, OptionCard, PageHeader, PageLoader, Select, VirtualList, VirtualScroller, cn, useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { dateShort, STORE_ROLE, STORE_ROLE_HINT } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { Invite, StoreRole, TeamMember } from '../../lib/types';
import { useStore } from './storeContext';

const copy = async (text: string, toast: ReturnType<typeof useToast>) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copiado', 'Envie para a pessoa pelo WhatsApp ou e-mail.');
  } catch {
    toast.error('Não foi possível copiar', text);
  }
};

function InviteDialog({ open, onClose, isOwner }: { open: boolean; onClose: () => void; isOwner: boolean }) {
  const { store } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StoreRole>('ATTENDANT');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(Invite & { accountExists: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setResult(null);
    setEmail('');
    setError(null);
    onClose();
  };
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post(`/merchant/stores/${store.id}/invites`, { email, role }));
      queryClient.invalidateQueries({ queryKey: ['merchant', store.id, 'team'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Convidar para a equipe"
      footer={result ? <Button onClick={close}>Pronto</Button> : <Button loading={busy} disabled={!email.includes('@')} onClick={send}>Gerar convite</Button>}
    >
      {result ? (
        <div className="grid gap-4">
          <p>
            Convite criado para <b>{result.email}</b> como {STORE_ROLE[result.role].toLowerCase()}. {result.accountExists ? 'A pessoa já tem conta e recebeu o convite nas notificações.' : 'Envie o link abaixo; ela cria a conta por ele.'}
          </p>
          <div className="flex gap-2">
            <Input readOnly value={result.link} onFocus={(e) => e.target.select()} aria-label="Link do convite" />
            <Button variant="outline" icon={Copy} onClick={() => copy(result.link, toast)}>
              Copiar
            </Button>
          </div>
          <p className="text-[13px] text-muted">O link vale 7 dias e só pode ser usado uma vez.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="E-mail da pessoa">{(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" />}</Field>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold text-ink">Papel</legend>
            {(isOwner ? (['MANAGER', 'ATTENDANT'] as StoreRole[]) : (['ATTENDANT'] as StoreRole[])).map((r) => (
              <OptionCard key={r} name="role" checked={role === r} onChange={() => setRole(r)} label={STORE_ROLE[r]} description={STORE_ROLE_HINT[r]} />
            ))}
          </fieldset>
        </div>
      )}
    </Dialog>
  );
}

export function TeamPage() {
  const { store, can } = useStore();
  const { me, refresh } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [inviting, setInviting] = useState(false);
  const key = ['merchant', store.id, 'team'];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ members: TeamMember[]; invites: Invite[] }>(`/merchant/stores/${store.id}/team`) });
  const isOwner = can('team.owner');
  const base = `/merchant/stores/${store.id}`;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (q.isLoading || !q.data) return <PageLoader />;
  const manageable = (m: TeamMember) => m.userId !== me?.id && m.role !== 'OWNER' && (isOwner || m.role === 'ATTENDANT');

  return (
    <>
      <PageHeader title="Equipe" description="Quem trabalha na loja e o que cada um pode fazer." actions={<Button icon={UserPlus} onClick={() => setInviting(true)}>Convidar</Button>} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <Card padded={false}>
          <VirtualList
            items={q.data.members}
            estimate={75}
            render={(m, idx) => (
              <div className={cn('flex flex-wrap items-center gap-3 px-5 py-4', idx > 0 && 'border-t border-line')}>
                <Avatar name={m.name} src={m.avatarUrl} size={42} />
                <div className="grid min-w-0 flex-1">
                  <strong className="truncate text-ink">
                    {m.name} {m.userId === me?.id && <span className="font-normal text-muted">(você)</span>}
                  </strong>
                  <span className="truncate text-sm text-muted">
                    {m.email}, desde {dateShort(m.since)}
                  </span>
                </div>
                {manageable(m) ? (
                  <Select aria-label={`Papel de ${m.name}`} className="h-10 w-40 text-sm" value={m.role} onChange={(e) => run(() => api.patch(`${base}/members/${m.id}`, { role: e.target.value }), 'Papel alterado')} disabled={!isOwner}>
                    {(['MANAGER', 'ATTENDANT'] as StoreRole[]).map((r) => (
                      <option key={r} value={r}>
                        {STORE_ROLE[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={m.role === 'OWNER' ? 'dark' : 'neutral'} icon={m.role === 'OWNER' ? Crown : undefined}>
                    {STORE_ROLE[m.role]}
                  </Badge>
                )}
                {isOwner && m.role !== 'OWNER' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (await confirm({ title: `Passar a loja para ${m.name}?`, description: 'A pessoa vira dona e você passa a ser gerente. Só ela poderá desfazer.', confirmLabel: 'Transferir', tone: 'danger' }))
                        run(async () => {
                          await api.post(`${base}/members/${m.id}/transfer-ownership`);
                          await refresh();
                        }, 'Loja transferida');
                    }}
                  >
                    Tornar dono
                  </Button>
                )}
                {manageable(m) && (
                  <IconButton
                    icon={Trash2}
                    label={`Remover ${m.name}`}
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (await confirm({ title: `Remover ${m.name} da equipe?`, description: 'A pessoa perde o acesso a esta loja na hora.', tone: 'danger', confirmLabel: 'Remover' })) run(() => api.delete(`${base}/members/${m.id}`), 'Removido da equipe');
                    }}
                  />
                )}
              </div>
            )}
          />
        </Card>

        <div className="grid gap-4">
          <Card>
            <h2 className="mb-3 text-lg">Convites pendentes</h2>
            {q.data.invites.length ? (
              <VirtualScroller
                items={q.data.invites}
                estimate={62}
                className="max-h-[50vh]"
                render={(i, idx) => (
                  <div className={cn('flex items-center gap-2 py-3', idx > 0 && 'border-t border-line')}>
                    <div className="grid min-w-0 flex-1">
                      <span className="truncate text-sm text-ink">{i.email}</span>
                      <span className="text-[13px] text-muted">
                        {STORE_ROLE[i.role]}, vale até {dateShort(i.expiresAt)}
                      </span>
                    </div>
                    <IconButton icon={Link2} label="Copiar link" variant="ghost" size="sm" onClick={() => copy(i.link, toast)} />
                    <IconButton icon={Trash2} label="Cancelar convite" variant="ghost" size="sm" onClick={() => run(() => api.delete(`${base}/invites/${i.id}`), 'Convite cancelado')} />
                  </div>
                )}
              />
            ) : (
              <p className="text-sm text-muted">Nenhum convite esperando resposta.</p>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 text-lg">Papéis</h2>
            <dl className="grid gap-3 text-sm">
              {(['OWNER', 'MANAGER', 'ATTENDANT'] as StoreRole[]).map((r) => (
                <div key={r}>
                  <dt className="font-bold text-ink">{STORE_ROLE[r]}</dt>
                  <dd className="text-muted">{STORE_ROLE_HINT[r]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} isOwner={isOwner} />
    </>
  );
}
