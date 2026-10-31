import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { Button } from './Button';
import { cn } from './cn';

/**
 * Listas longas virtualizadas pela rolagem da janela: só os itens perto da tela ficam no DOM.
 * A altura de cada item é medida depois de desenhado (alturas diferentes funcionam).
 * `onEnd` é chamado perto do fim, para buscar a próxima página.
 */
function useScrollMargin<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const measure = () => ref.current && setMargin(ref.current.getBoundingClientRect().top + window.scrollY);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);
  return [ref, margin] as const;
}

function useEndReached(last: number, count: number, onEnd?: () => void) {
  useEffect(() => {
    if (onEnd && count > 0 && last >= count - 5) onEnd();
  }, [last, count, onEnd]);
}

/** Controle de uma VirtualList: rolar até um item e saber qual item está no topo (abas que seguem a rolagem) */
export interface VirtualListHandle {
  /** rola a janela até o item, deixando `offset` px livres em cima (cabeçalhos fixos) */
  scrollTo: (index: number, offset?: number) => void;
  /** último item cujo começo já passou da linha `offset` px abaixo do topo da janela */
  indexAt: (offset?: number) => number;
}

export function VirtualList<T extends { id: string }>({ items, render, estimate = 88, gap = 0, onEnd, className, handle }: { items: T[]; render: (item: T, index: number) => ReactNode; estimate?: number; gap?: number; onEnd?: () => void; className?: string; handle?: Ref<VirtualListHandle> }) {
  const [ref, scrollMargin] = useScrollMargin<HTMLDivElement>();
  const v = useWindowVirtualizer({ count: items.length, estimateSize: () => estimate, overscan: 6, gap, scrollMargin, getItemKey: (i) => items[i].id });
  const rows = v.getVirtualItems();
  useEndReached(rows[rows.length - 1]?.index ?? -1, items.length, onEnd);
  useImperativeHandle(handle, () => ({
    scrollTo: (index, offset = 0) => {
      const m = v.measurementsCache[index];
      if (m) window.scrollTo({ top: Math.max(0, m.start - offset), behavior: 'smooth' });
    },
    indexAt: (offset = 0) => {
      const line = window.scrollY + offset;
      let found = 0;
      for (const m of v.measurementsCache) if (m.start <= line) found = m.index;
      return found;
    },
  }), [v]);
  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height: v.getTotalSize() }}>
      {rows.map((r) => (
        <div key={r.key} data-index={r.index} ref={v.measureElement} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${r.start - scrollMargin}px)` }}>
          {render(items[r.index], r.index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Lista virtualizada que rola dentro do próprio contêiner (janelas, gavetas, colunas do kanban).
 * `className` define a altura máxima do contêiner (ex.: max-h-[60vh]).
 */
export function VirtualScroller<T extends { id: string }>({ items, render, estimate = 72, gap = 0, onEnd, className }: { items: T[]; render: (item: T, index: number) => ReactNode; estimate?: number; gap?: number; onEnd?: () => void; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: items.length, estimateSize: () => estimate, overscan: 6, gap, getScrollElement: () => scroller.current, getItemKey: (i) => items[i].id });
  const rows = v.getVirtualItems();
  useEndReached(rows[rows.length - 1]?.index ?? -1, items.length, onEnd);
  return (
    <div ref={scroller} className={cn('overflow-y-auto overscroll-contain', className)}>
      <div className="relative w-full" style={{ height: v.getTotalSize() }}>
        {rows.map((r) => (
          <div key={r.key} data-index={r.index} ref={v.measureElement} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${r.start}px)` }}>
            {render(items[r.index], r.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Corpo de <table> virtualizado (linhas de espaço em cima e embaixo mantêm o layout da tabela) */
export function VirtualRows<T extends { id: string }>({ items, row, colSpan, estimate = 60, onEnd }: { items: T[]; row: (item: T, measure: { ref: (el: Element | null) => void; 'data-index': number }) => ReactNode; colSpan: number; estimate?: number; onEnd?: () => void }) {
  const [ref, scrollMargin] = useScrollMargin<HTMLTableSectionElement>();
  const v = useWindowVirtualizer({ count: items.length, estimateSize: () => estimate, overscan: 8, scrollMargin, getItemKey: (i) => items[i].id });
  const rows = v.getVirtualItems();
  useEndReached(rows[rows.length - 1]?.index ?? -1, items.length, onEnd);
  const top = rows.length ? rows[0].start - scrollMargin : 0;
  const bottom = rows.length ? v.getTotalSize() - (rows[rows.length - 1].end - scrollMargin) : 0;
  return (
    <tbody ref={ref}>
      {top > 0 && (
        <tr aria-hidden>
          <td colSpan={colSpan} style={{ height: top, padding: 0, border: 0 }} />
        </tr>
      )}
      {rows.map((r) => (
        <Fragment key={r.key}>{row(items[r.index], { ref: v.measureElement, 'data-index': r.index })}</Fragment>
      ))}
      {bottom > 0 && (
        <tr aria-hidden>
          <td colSpan={colSpan} style={{ height: bottom, padding: 0, border: 0 }} />
        </tr>
      )}
    </tbody>
  );
}

/** Rodapé de lista paginada: botão de reserva para a rolagem infinita, ou o fim */
export function LoadMore({ hasMore, loading, onClick, total, noun = 'itens' }: { hasMore: boolean; loading: boolean; onClick: () => void; total: number; noun?: string }) {
  if (!hasMore && !total) return null;
  return (
    <div className="grid justify-items-center py-5 text-[13px] text-muted">
      {hasMore ? (
        <Button variant="outline" size="sm" loading={loading} onClick={onClick}>
          Carregar mais
        </Button>
      ) : (
        <span>
          Fim da lista ({total} {noun})
        </span>
      )}
    </div>
  );
}

// ── tabela

export function Table({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('border-b border-line bg-canvas px-4 py-3 text-[13px] font-bold whitespace-nowrap text-muted', className)} {...rest} />;
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle text-ink', className)} {...rest} />;
}

/** Classe para <tr> clicável */
export const rowClass = 'cursor-pointer transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none';
