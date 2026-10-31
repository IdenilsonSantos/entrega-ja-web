import { cn } from './cn';

/**
 * Barras verticais simples (pedidos ou faturamento por dia).
 * Rótulos no eixo X e o valor de cada barra no hover/foco (title), sem biblioteca de gráfico.
 */
export function BarChart({ data, format = String, height = 180, className, label }: { data: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; height?: number; className?: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.ceil(data.length / 7);
  return (
    <figure className={cn('grid gap-2', className)} aria-label={label}>
      <div className="flex items-end gap-1.5 border-b border-line" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" title={`${d.hint ?? d.label}: ${format(d.value)}`} tabIndex={0}>
            <div className={cn('w-full rounded-t-[4px] transition', d.value ? 'bg-series-1 group-hover:brightness-110' : 'bg-line')} style={{ height: `${Math.max(d.value ? 4 : 2, (d.value / max) * 100)}%` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded-sm bg-navy px-1.5 py-0.5 text-[11px] whitespace-nowrap text-white group-hover:block group-focus:block">{format(d.value)}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 text-[11px] text-muted">
        {data.map((d, i) => (
          <span key={i} className="flex-1 overflow-visible text-center whitespace-nowrap">
            {i % step === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}
