import { ScrollText } from 'lucide-react';
import { EmptyState, LoadMore, PageHeader, PageLoader, VirtualList } from '../../ds';
import { dateTime } from '../../lib/format';
import { usePaged } from '../../lib/query';
import { AUDIT_ACTION, type AuditEntry } from './types';

/** Tudo o que a administração fez, do mais recente para o mais antigo */
export function AuditPage() {
  const list = usePaged<AuditEntry>(['admin', 'audit'], '/admin/audit', { limit: 40 });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Auditoria" description="Registro das ações de moderação e administração" />
      {list.loading ? (
        <PageLoader />
      ) : !list.items.length ? (
        <EmptyState icon={ScrollText} title="Nenhuma ação registrada" />
      ) : (
        <>
          <VirtualList
            items={list.items}
            estimate={72}
            onEnd={list.loadMore}
            render={(a) => (
              <div className="grid gap-0.5 border-b border-line py-3 text-sm sm:grid-cols-[160px_1fr]">
                <span className="text-muted tabular-nums">{dateTime(a.createdAt)}</span>
                <span>
                  <b className="text-ink">{a.actor.name}</b> {AUDIT_ACTION[a.action] ?? a.action} <b className="text-ink">{a.action === 'settings.update' ? '' : a.targetName}</b>
                  {a.reason && a.action !== 'settings.update' && <span className="block text-muted">"{a.reason}"</span>}
                </span>
              </div>
            )}
          />
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onClick={list.loadMore} total={list.items.length} noun="registros" />
        </>
      )}
    </div>
  );
}
