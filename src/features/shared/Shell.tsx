import { ArrowLeft, Bell, LogOut, Menu, UserRound, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, matchPath, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, CountBadge, Dialog, IconButton, cn } from '../../ds';
import { useAuth } from '../../lib/auth';
import { useUnread } from './notifications';
import { NotificationsDrawer } from './NotificationsDrawer';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  count?: number;
  /** some no celular (a barra inferior tem espaço para 5) */
  desktopOnly?: boolean;
}

export function Wordmark({ dark, compact, className }: { dark?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[19px] font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink', className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h11M10 6l6 6-6 6" />
          <path d="M18 5v14" />
        </svg>
      </span>
      <span className={cn(compact && 'sr-only')}>Entrega Já</span>
    </span>
  );
}

function Bell_() {
  const [open, setOpen] = useState(false);
  const unread = useUnread();
  return (
    <>
      <IconButton icon={Bell} label="Notificações" onClick={() => setOpen(true)} badge={<CountBadge count={unread} />} />
      <NotificationsDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
export { Bell_ as NotificationBell };

/**
 * Estrutura dos painéis (lojista, entregador, admin):
 * desktop → menu lateral fixo; celular → barra superior e navegação inferior.
 */
export function PanelShell({ nav, header, children, profileTo = '/perfil' }: { nav: NavItem[]; header?: ReactNode; children: ReactNode; profileTo?: string }) {
  const { me, signOut } = useAuth();
  const [more, setMore] = useState(false);
  const main = nav.filter((n) => !n.desktopOnly);
  const extra = nav.filter((n) => n.desktopOnly);
  // no celular cabem 5. Com "Mais", ficam 4 na barra e o resto (inclusive o 5º) vai para ele
  const needsMore = main.length > 5 || extra.length > 0;
  const mobileNav = needsMore ? main.slice(0, 4) : main;
  const overflow = needsMore ? [...main.slice(4), ...extra] : [];
  // no celular, página fora da barra inferior (veio de "Mais", do perfil…) ganha um voltar no topo
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const at = (items: NavItem[]) => items.some((n) => matchPath({ path: n.to, end: !!n.end }, pathname));
  const showBack = !at(mobileNav);
  const inMore = at(overflow);
  const back = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(mobileNav[0]?.to ?? '/'));
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link to="/" className="px-2 no-underline">
          <Wordmark />
        </Link>
        {header}
        <nav className="grid gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-btn px-3 text-sm font-bold no-underline transition', isActive ? 'bg-primary-soft text-primary-text' : 'text-text hover:bg-hover')}
            >
              <n.icon size={19} aria-hidden />
              <span className="flex-1">{n.label}</span>
              {!!n.count && <span className="rounded-full bg-primary px-2 text-[11px] text-white">{n.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-line pt-4">
          <Link to={profileTo} className="flex items-center gap-3 rounded-btn p-2 no-underline hover:bg-hover">
            <Avatar name={me?.name ?? ''} src={me?.avatarUrl} size={36} />
            <span className="grid min-w-0">
              <strong className="truncate text-sm text-ink">{me?.name}</strong>
              <span className="truncate text-xs text-muted">{me?.email}</span>
            </span>
          </Link>
          <button type="button" onClick={signOut} className="flex h-10 items-center gap-3 rounded-btn px-3 text-sm font-bold text-muted hover:bg-hover hover:text-ink">
            <LogOut size={18} aria-hidden /> Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:justify-end lg:border-0 lg:bg-transparent lg:px-8 lg:pt-5 lg:pb-0 lg:backdrop-blur-none">
          {showBack ? (
            <IconButton icon={ArrowLeft} label="Voltar" onClick={back} className="lg:hidden" />
          ) : (
            <Link to="/" className="no-underline lg:hidden">
              <Wordmark compact={!!header} />
            </Link>
          )}
          <div className="ml-auto flex min-w-0 items-center gap-2 lg:ml-0">
            <div className="min-w-0 lg:hidden">{header}</div>
            <Bell_ />
            <Link to={profileTo} className="rounded-full lg:hidden" aria-label="Meu perfil">
              <Avatar name={me?.name ?? ''} src={me?.avatarUrl} size={40} />
            </Link>
          </div>
        </div>
        <main className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <BottomNav items={mobileNav} className="lg:hidden" extra={overflow.length > 0 && (
        <button type="button" onClick={() => setMore(true)} aria-current={inMore ? 'page' : undefined} className={cn('grid h-16 flex-1 place-items-center content-center gap-1 text-[11px] font-bold', inMore ? 'text-primary-text' : 'text-muted')}>
          <Menu size={22} aria-hidden />
          Mais
        </button>
      )} />
      <Dialog open={more} onClose={() => setMore(false)} title="Mais" size="sm">
        <nav className="grid divide-y divide-line">
          {overflow.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMore(false)} className="flex items-center gap-3 py-3.5 font-bold text-ink no-underline">
              <n.icon size={20} aria-hidden /> <span className="flex-1">{n.label}</span>
              {!!n.count && <span className="rounded-full bg-primary px-2 text-xs text-white">{n.count}</span>}
            </NavLink>
          ))}
          <button type="button" onClick={signOut} className="flex items-center gap-3 py-3.5 text-left font-bold text-muted">
            <LogOut size={20} aria-hidden /> Sair
          </button>
        </nav>
      </Dialog>
    </div>
  );
}

export function BottomNav({ items, className, extra }: { items: NavItem[]; className?: string; extra?: ReactNode }) {
  return (
    <nav className={cn('fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur', className)}>
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) => cn('relative grid h-16 flex-1 place-items-center content-center gap-1 text-[11px] font-bold no-underline', isActive ? 'text-primary-text' : 'text-muted')}
        >
          <n.icon size={22} aria-hidden />
          {n.label}
          {!!n.count && <span className="absolute top-2 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">{n.count}</span>}
        </NavLink>
      ))}
      {extra}
    </nav>
  );
}

export const ProfileIcon = UserRound;
