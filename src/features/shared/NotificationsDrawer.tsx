import { Bell, BellRing, Bike, CheckCheck, ClipboardList, Flag, PackageCheck, ShieldAlert, Store, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Drawer, EmptyState, Spinner, VirtualScroller, cn, type Tone } from '../../ds';

const TONE_TEXT: Record<Tone, string> = { neutral: 'text-muted', primary: 'text-primary-text', success: 'text-success', warn: 'text-warn', info: 'text-info', danger: 'text-danger', dark: 'text-ink' };
import { timeAgo } from '../../lib/format';
import { usePaged } from '../../lib/query';
import type { Notification } from '../../lib/types';
import { markRead } from './notifications';
import { PushCard } from './PushCard';

/** Ícone e cor por tipo de aviso */
const KIND: [RegExp, LucideIcon, Tone][] = [
  [/^offer|^order\.assigned/, Bike, 'primary'],
  [/^order\.(delivered|picked_up)/, PackageCheck, 'success'],
  [/^order\.(rejected|cancelled|dropped)|dispatch\.stuck/, ShieldAlert, 'danger'],
  [/^order/, ClipboardList, 'info'],
  [/^store|^product/, Store, 'warn'],
  [/^team/, Users, 'info'],
  [/^report/, Flag, 'danger'],
  [/^courier|^account/, UserCheck, 'success'],
];
const kind = (t: string) => KIND.find(([re]) => re.test(t)) ?? [null, BellRing, 'neutral' as Tone];

export function NotificationItem({ n, onOpen }: { n: Notification; onOpen: (n: Notification) => void }) {
  const [, Icon, tone] = kind(n.type);
  return (
    // mesmo respiro lateral (16px) do cartão de ativar notificações, para ícones e textos alinharem
    <button type="button" onClick={() => onOpen(n)} className={cn('flex w-full items-start gap-3 rounded-card px-4 py-3.5 text-left transition hover:bg-hover', !n.readAt && 'bg-primary-soft/40')}>
      <Icon size={20} className={cn('mt-0.5 shrink-0', TONE_TEXT[tone])} aria-hidden />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <strong className="text-sm text-ink">{n.title}</strong>
          <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
        </span>
        <span className="text-[13px] text-text">{n.body}</span>
      </span>
      {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="não lida" />}
    </button>
  );
}

export function NotificationsList({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const list = usePaged<Notification>(['notifications'], '/notifications', { limit: 20 });
  const open = (n: Notification) => {
    if (!n.readAt) markRead([n.id]);
    if (n.link) {
      onNavigate?.();
      navigate(n.link);
    }
  };
  if (list.loading) return <Spinner className="m-6" />;
  if (!list.items.length) return <EmptyState icon={Bell} title="Nada por aqui" description="Os avisos de pedidos, entregas e da sua conta aparecem aqui." />;
  return (
    <>
      {/* rola dentro da gaveta e busca a próxima página perto do fim */}
      <VirtualScroller items={list.items} estimate={76} gap={4} className="-mx-6 max-h-[calc(100dvh-240px)] px-6" onEnd={list.hasMore && !list.loadingMore ? list.loadMore : undefined} render={(n) => <NotificationItem n={n} onOpen={open} />} />
      {list.loadingMore && <Spinner className="mx-auto my-3" />}
    </>
  );
}

export function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notificações"
      width={460}
      footer={
        <Button variant="ghost" size="sm" icon={CheckCheck} onClick={() => markRead()}>
          Marcar todas como lidas
        </Button>
      }
    >
      <PushCard compact />
      <NotificationsList onNavigate={onClose} />
    </Drawer>
  );
}
