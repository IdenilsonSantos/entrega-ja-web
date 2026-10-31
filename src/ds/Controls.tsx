import { Check, Minus, Plus } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from './cn';

/** Caixa de seleção com o texto ao lado (o texto inteiro é clicável) */
export function Checkbox({ label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 py-1', rest.disabled && 'cursor-not-allowed opacity-55', className)}>
      <input type="checkbox" className="peer sr-only" {...rest} />
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] border-subtle bg-surface text-white transition peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:shadow-ring [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
        <Check size={14} strokeWidth={3} aria-hidden />
      </span>
      <span className="grid">
        <span className="text-[15px] text-ink">{label}</span>
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}

/**
 * Opção em cartão (escolha única ou múltipla): forma de pagamento, tipo de conta, opções do produto.
 */
export function OptionCard({
  type = 'radio',
  label,
  description,
  aside,
  icon,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { type?: 'radio' | 'checkbox'; label: ReactNode; description?: ReactNode; aside?: ReactNode; icon?: ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] border-line bg-surface px-4 py-3 transition hover:border-subtle has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:shadow-ring has-disabled:cursor-not-allowed has-disabled:opacity-55',
        className,
      )}
    >
      <input type={type} className="sr-only" {...rest} />
      {icon}
      <span className="grid min-w-0 flex-1">
        <span className="font-bold text-ink">{label}</span>
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </span>
      {aside && <span className="shrink-0 text-sm text-muted">{aside}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, description, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-55', className)}>
      <span className="grid">
        <span className="text-[15px] text-ink">{label}</span>
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-subtle/60 transition peer-checked:bg-success peer-focus-visible:shadow-ring after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" aria-hidden />
    </label>
  );
}

/** Seletor de poucas opções lado a lado (Kanban/Lista, 7/30 dias) */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-btn bg-field p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-field px-3 text-[13px] font-bold whitespace-nowrap text-muted transition', value === o.value ? 'bg-surface text-ink shadow-card' : 'hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Abas por botões (estado local) */
export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div role="tablist" className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold whitespace-nowrap transition', value === t.value ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className={cn('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-primary text-white' : 'bg-field text-muted')}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Abas que são rotas (a URL muda) */
export function NavTabs({ tabs, className }: { tabs: { to: string; label: ReactNode; end?: boolean; count?: number }[]; className?: string }) {
  return (
    <nav className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => cn('-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold whitespace-nowrap no-underline transition', isActive ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {t.label}
          {!!t.count && <span className="rounded-full bg-primary px-1.5 text-[11px] text-white">{t.count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

/** Filtro em pílula (categorias da vitrine, filtros de lista) */
export function Chip({ active, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-bold whitespace-nowrap transition', active ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-subtle', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Quantidade com − e + */
export function Stepper({ value, onChange, min = 0, max = 50, size = 'md', label = 'Quantidade' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md'; label?: string }) {
  const btn = cn('grid place-items-center rounded-full bg-hover text-ink transition enabled:hover:brightness-95 disabled:opacity-40', size === 'sm' ? 'size-8' : 'size-10');
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuir">
        <Minus size={16} />
      </button>
      <span className={cn('min-w-6 text-center font-bold text-ink tabular-nums', size === 'md' && 'text-lg')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar">
        <Plus size={16} />
      </button>
    </div>
  );
}
