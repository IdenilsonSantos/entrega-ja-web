import { Search } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const control =
  'w-full rounded-field border-[1.5px] border-transparent bg-field text-[15px] text-ink transition-[border-color,box-shadow] placeholder:text-subtle focus:border-primary focus:shadow-ring focus:outline-none disabled:opacity-60 aria-invalid:border-danger';

export const controlClass = control;

/**
 * Campo com rótulo, dica e erro. O id é gerado e ligado ao controle (acessibilidade):
 *   <Field label="E-mail" error={err}>{(p) => <Input {...p} type="email" />}</Field>
 */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">opcional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { prefix?: ReactNode; suffix?: ReactNode }>(function Input(
  { className, prefix, suffix, ...rest },
  ref,
) {
  if (!prefix && !suffix) return <input ref={ref} className={cn(control, 'h-field px-4', className)} {...rest} />;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-sm text-muted">{prefix}</span>}
      <input ref={ref} className={cn(control, 'h-field px-4', prefix && 'pl-11', suffix && 'pr-12', className)} {...rest} />
      {suffix && <span className="absolute inset-y-0 right-3 grid place-items-center text-sm text-muted">{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'resize-y px-4 py-3 leading-normal', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(control, 'h-field appearance-none px-4 pr-10', className)}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23646982' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundSize: '12px',
        backgroundPosition: 'right 16px center',
        backgroundRepeat: 'no-repeat',
      }}
      {...rest}
    >
      {children}
    </select>
  );
});

/** Busca com ícone (lista de lojas, filtros do admin) */
export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SearchInput({ className, ...rest }, ref) {
  return (
    <div className={cn('relative', className)}>
      <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input ref={ref} type="search" className={cn(control, 'h-11 pr-4 pl-11')} {...rest} />
    </div>
  );
});

/**
 * Valor em reais editado como texto ("12,90") e entregue em centavos.
 * Aceita vírgula ou ponto; vazio vira null.
 */
export function MoneyInput({ value, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null; onChange: (cents: number | null) => void }) {
  return (
    <Input
      inputMode="decimal"
      prefix="R$"
      defaultValue={value === null ? '' : (value / 100).toFixed(2).replace('.', ',')}
      onChange={(e) => {
        const raw = e.target.value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
        onChange(raw === '' ? null : Math.round(Number(raw) * 100));
      }}
      {...rest}
    />
  );
}
