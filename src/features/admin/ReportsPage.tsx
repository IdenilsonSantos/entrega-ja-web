import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Dialog, EmptyState, Field, LoadMore, OptionCard, PageHeader, PageLoader, Segmented, Textarea, VirtualList, useToast } from '../../ds';
import { api } from '../../lib/api';
import { dateTime, ROLE } from '../../lib/format';
import { queryClient, usePaged } from '../../lib/query';
import type { Role } from '../../lib/types';
import { REPORT_REASON, type Report } from './types';

const TARGET: Record<Report['targetType'], { label: string; link: (id: string) => string; action?: { value: 'block_user' | 'suspend_store' | 'remove_product'; label: string } }> = {
  STORE: { label: 'Loja', link: (id) => `/admin/lojas?id=${id}`, action: { value: 'suspend_store', label: 'Suspender a loja' } },
  PRODUCT: { label: 'Produto', link: () => '/admin/lojas', action: { value: 'remove_product', label: 'Tirar o produto do ar' } },
  USER: { label: 'Conta', link: (id) => `/admin/contas?id=${id}`, action: { value: 'block_user', label: 'Bloquear a conta' } },
  ORDER: { label: 'Pedido', link: (id) => `/admin/pedidos?id=${id}` },
};

function ResolveDialog({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const toast = useToast();
  const [outcome, setOutcome] = useState<'RESOLVED' | 'DISMISSED' | 'ACTION'>('RESOLVED');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (!report) return null;
  const t = TARGET[report.targetType];
  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/reports/${report.id}/resolve`, { status: outcome === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED', resolution: text.trim(), ...(outcome === 'ACTION' && { action: t.action!.value }) });
      toast.success('Denúncia tratada', 'Quem denunciou recebe a resposta.');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setText('');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Tratar denúncia" description={`${t.label}: ${report.targetName}`} footer={<Button loading={busy} disabled={text.trim().length < 3} onClick={send}>Concluir</Button>}>
      <div className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-bold text-ink">Decisão</legend>
          {t.action && <OptionCard name="o" checked={outcome === 'ACTION'} onChange={() => setOutcome('ACTION')} label={t.action.label} description="Aplica a medida e registra na auditoria" />}
          <OptionCard name="o" checked={outcome === 'RESOLVED'} onChange={() => setOutcome('RESOLVED')} label="Resolvida sem punição" description="Ex.: conversamos com a loja e ela corrigiu" />
          <OptionCard name="o" checked={outcome === 'DISMISSED'} onChange={() => setOutcome('DISMISSED')} label="Arquivar" description="Não encontramos problema" />
        </fieldset>
        <Field label={outcome === 'ACTION' ? 'Motivo (a pessoa afetada vê este texto)' : 'Resposta'}>{(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />}</Field>
      </div>
    </Dialog>
  );
}

export function ReportsPage() {
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED'>('OPEN');
  const list = usePaged<Report>(['admin', 'reports', status], `/admin/reports?status=${status}`, { limit: 30 });
  const [resolving, setResolving] = useState<Report | null>(null);
  return (
    <>
      <PageHeader title="Denúncias" actions={<Segmented label="Situação" value={status} onChange={setStatus} options={[{ value: 'OPEN', label: 'Abertas' }, { value: 'RESOLVED', label: 'Resolvidas' }, { value: 'DISMISSED', label: 'Arquivadas' }]} />} />
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={Flag} title={status === 'OPEN' ? 'Nenhuma denúncia aberta' : 'Nada por aqui'} />
      ) : (
        <>
          <VirtualList
            items={list.items}
            estimate={140}
            onEnd={list.loadMore}
            render={(r) => (
              <article className="grid gap-2 border-b border-line py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">{REPORT_REASON[r.reason] ?? r.reason}</Badge>
                  <span className="text-sm text-muted">{TARGET[r.targetType].label}:</span>
                  <Link to={TARGET[r.targetType].link(r.targetId)} className="font-bold">
                    {r.targetName}
                  </Link>
                  <span className="ml-auto text-[13px] text-muted">{dateTime(r.createdAt)}</span>
                </div>
                {r.details && <p className="text-sm text-text">{r.details}</p>}
                <p className="text-[13px] text-muted">
                  Enviada por {r.reporter.name} ({ROLE[r.reporter.role as Role]?.toLowerCase()})
                </p>
                {r.resolution && <Alert tone={r.status === 'RESOLVED' ? 'success' : 'neutral'}>{r.resolution}</Alert>}
                {r.status === 'OPEN' && (
                  <Button size="sm" className="justify-self-start" onClick={() => setResolving(r)}>
                    Tratar
                  </Button>
                )}
              </article>
            )}
          />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="denúncias" />
        </>
      )}
      <ResolveDialog report={resolving} onClose={() => setResolving(null)} />
    </>
  );
}
