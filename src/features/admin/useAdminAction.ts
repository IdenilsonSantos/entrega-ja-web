import { useConfirm, useToast } from '../../ds';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/query';

/**
 * Ações de moderação: confirma (com motivo quando a pessoa afetada precisa saber por quê),
 * chama a API, avisa e atualiza as listas do admin.
 */
export function useAdminAction() {
  const confirm = useConfirm();
  const toast = useToast();
  return async (opts: { path: string; title: string; description?: string; confirmLabel: string; done: string; reason?: string; danger?: boolean; body?: Record<string, unknown> }) => {
    const r = await confirm({ title: opts.title, description: opts.description, confirmLabel: opts.confirmLabel, tone: opts.danger ? 'danger' : 'primary', reason: opts.reason ? { label: opts.reason } : undefined });
    if (!r) return false;
    try {
      await api.post(opts.path, { ...(opts.body ?? {}), ...(typeof r === 'string' && { reason: r }) });
      toast.success(opts.done);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      return true;
    } catch (e) {
      toast.error('Não foi possível concluir', (e as Error).message);
      return false;
    }
  };
}
