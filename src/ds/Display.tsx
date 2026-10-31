import { AlertCircle, CheckCircle2, Info, Loader2, Star, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { assetUrl } from '../lib/api';
import { cn } from './cn';

export type Tone = 'neutral' | 'primary' | 'success' | 'warn' | 'info' | 'danger' | 'dark';

const SOFT: Record<Tone, string> = {
  neutral: 'bg-field text-muted',
  primary: 'bg-primary-tag text-primary-text',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  dark: 'bg-navy text-white',
};

const TEXT: Record<Tone, string> = { neutral: 'text-muted', primary: 'text-primary-text', success: 'text-success', warn: 'text-warn', info: 'text-info', danger: 'text-danger', dark: 'text-ink' };

// ── superfícies

export function Card({ className, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cn('rounded-card border border-line bg-surface', padded && 'p-5', className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="grid gap-0.5">
        <h3>{title}</h3>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Título da página com ações à direita (quebra em telas pequenas) */
export function PageHeader({ title, description, actions, back, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {back}
        <div className="grid min-w-0 gap-1">
          <h1 className="truncate">{title}</h1>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {/* no celular as ações descem para uma linha própria e dividem a largura */}
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-lg">{children}</h2>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}

// ── estados

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid justify-items-center gap-3 px-6 py-12 text-center', className)}>
      <Icon size={32} strokeWidth={1.6} className="text-subtle" aria-hidden />
      <h3>{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-field bg-shimmer', className)} aria-hidden />;
}

export function Spinner({ className, label = 'Carregando' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <Loader2 size={20} className="animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Página carregando: centralizado */
export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner />
    </div>
  );
}

const ALERT_ICON: Partial<Record<Tone, LucideIcon>> = { info: Info, success: CheckCircle2, warn: TriangleAlert, danger: AlertCircle, primary: Info, neutral: Info };

export function Alert({ tone = 'info', title, children, action, className }: { tone?: Exclude<Tone, 'dark'>; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = ALERT_ICON[tone] ?? Info;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-card px-4 py-3 text-sm', SOFT[tone], className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="grid min-w-0 flex-1 gap-0.5">
        {title && <strong className="font-bold">{title}</strong>}
        {children && <div className="text-text">{children}</div>}
      </div>
      {action}
    </div>
  );
}

// ── dados

export function Badge({ tone = 'neutral', icon: Icon, dot, className, children }: { tone?: Tone; icon?: LucideIcon; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-bold whitespace-nowrap', SOFT[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {Icon && <Icon size={13} aria-hidden />}
      {children}
    </span>
  );
}

/** Indicador "ao vivo" / online */
export function LiveDot({ on = true, className }: { on?: boolean; className?: string }) {
  return <span className={cn('inline-block size-2.5 shrink-0 rounded-full', on ? 'animate-ping-soft bg-success text-success/60' : 'bg-subtle', className)} aria-hidden />;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) return <img src={assetUrl(src)} alt="" className={cn('shrink-0 rounded-full object-cover', className)} style={style} />;
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-primary-tag font-bold text-primary-text', className)} style={style} aria-hidden>
      {initials(name) || '?'}
    </span>
  );
}

/** Foto (produto, logo, capa) com reserva desenhada quando não há imagem */
export function Thumb({ src, name, className, rounded = 'rounded-card' }: { src?: string | null; name: string; className?: string; rounded?: string }) {
  if (src) return <img src={assetUrl(src)} alt="" loading="lazy" className={cn('shrink-0 bg-field object-cover', rounded, className)} />;
  // sem foto: bloco neutro com a inicial, discreto, para a falta de foto não chamar atenção
  return (
    <span className={cn('grid shrink-0 place-items-center bg-field font-bold text-subtle', rounded, className)} aria-label={name}>
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}

export function IconCircle({ icon: Icon, tone = 'primary', size = 44, className }: { icon: LucideIcon; tone?: Tone; size?: number; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full', SOFT[tone], className)} style={{ width: size, height: size }} aria-hidden>
      <Icon size={size * 0.45} />
    </span>
  );
}

export function Stat({ label, value, hint, icon, tone = 'primary', className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <Card className={cn('grid content-start gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        {icon && (() => { const I = icon; return <I size={18} className={TEXT[tone]} aria-hidden />; })()}
      </div>
      <strong className="text-[28px] leading-none font-bold text-ink tabular-nums">{value}</strong>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </Card>
  );
}

/** Lista de pares rótulo → valor (detalhes de pedido, conta, loja) */
export function DescriptionList({ items, className }: { items: { label: ReactNode; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid gap-3', className)}>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-3 text-sm">
          <dt className="text-muted">{it.label}</dt>
          <dd className="min-w-0 break-words text-ink">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-bold text-ink', className)}>
      <Star size={15} className="fill-primary text-primary" aria-hidden />
      {value ? value.toFixed(1).replace('.', ',') : 'Novo'}
      {count !== undefined && count > 0 && <span className="font-normal text-muted">({count})</span>}
    </span>
  );
}

/** Estrelas clicáveis para avaliar */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded-full p-1">
          <Star size={32} className={cn('transition', n <= value ? 'fill-primary text-primary' : 'text-subtle')} />
        </button>
      ))}
    </div>
  );
}
