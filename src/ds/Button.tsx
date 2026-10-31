import { Loader2, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white enabled:hover:bg-primary-press',
  secondary: 'bg-primary-soft text-primary-text enabled:hover:bg-primary-tag',
  outline: 'border-[1.5px] border-line bg-surface text-ink enabled:hover:border-subtle enabled:hover:bg-hover',
  ghost: 'text-ink enabled:hover:bg-hover',
  danger: 'bg-danger-soft text-danger enabled:hover:brightness-95',
  dark: 'bg-navy text-white enabled:hover:bg-navy-2',
  success: 'bg-success text-white enabled:hover:brightness-110',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-field px-3.5 text-[13px]',
  md: 'h-11 gap-2 rounded-btn px-5 text-sm',
  lg: 'h-cta gap-2 rounded-btn px-6 text-base',
};

/**
 * Classes do botão, para usar em <Link> com cara de botão.
 * No celular, botão sozinho na linha ocupa a largura toda: quando é o único filho do contêiner e
 * quando é item de grade (o justify-self-start das telas vale só a partir de 640px).
 */
export const buttonClass = ({ variant = 'primary', size = 'md', full }: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean } = {}) =>
  cn(
    'inline-flex shrink-0 items-center justify-center font-bold whitespace-nowrap no-underline transition-[background-color,border-color,filter,opacity] select-none disabled:opacity-45',
    VARIANT[variant],
    SIZE[size],
    full ? 'w-full' : 'max-sm:justify-self-stretch max-sm:only:w-full',
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, full, loading, icon: Icon, iconRight: IconRight, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 15 : 18;
  return (
    <button ref={ref} type={type} className={cn(buttonClass({ variant, size, full }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden /> : Icon && <Icon size={iconSize} aria-hidden />}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden />}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** obrigatório: o botão só tem ícone, então o nome vai para leitores de tela */
  label: string;
  variant?: 'round' | 'ghost' | 'dark' | 'primary';
  size?: 'sm' | 'md';
  badge?: ReactNode;
}

const ICON_VARIANT = {
  round: 'bg-hover text-ink enabled:hover:brightness-95',
  ghost: 'text-ink enabled:hover:bg-hover',
  dark: 'bg-navy text-white enabled:hover:bg-navy-2',
  primary: 'bg-primary text-white enabled:hover:bg-primary-press',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'round', size = 'md', badge, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn('relative inline-grid shrink-0 place-items-center rounded-full transition disabled:opacity-45', size === 'sm' ? 'size-9' : 'size-tap', ICON_VARIANT[variant], className)}
      {...rest}
    >
      <Icon size={size === 'sm' ? 17 : 20} aria-hidden />
      {badge}
    </button>
  );
});

/** Contador sobre um botão (sacola, sininho) */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white ring-2 ring-bg', className)} aria-label={`${count} novos`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Botões lado a lado: sempre com a mesma largura (e altura média). O botão grande (lg) é só para
 * a ação única no fim da tela, nunca em par.
 */
export function ButtonRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid auto-cols-fr grid-flow-col gap-2', className)}>{children}</div>;
}

/** Botão de texto, para ações secundárias dentro de frases e cabeçalhos */
export function TextButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn('inline-flex items-center gap-1 text-sm font-bold text-primary-text hover:underline disabled:opacity-45', className)} {...rest} />;
}
