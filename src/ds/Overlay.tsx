import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton } from './Button';
import { cn } from './cn';
import { Field, Textarea } from './Field';

/** Trava a rolagem da página, fecha no Esc e devolve o foco ao fechar */
function useModal(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button:not([data-close])');
      (first ?? panel.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // mantém o Tab dentro do painel
      if (e.key === 'Tab' && panel.current) {
        const els = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!els.length) return;
        const [first, last] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === first) (last.focus(), e.preventDefault());
        else if (!e.shiftKey && document.activeElement === last) (first.focus(), e.preventDefault());
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return panel;
}

/**
 * Modal: centralizado no desktop e painel que sobe de baixo no celular.
 * `footer` fica fixo embaixo (ações), o corpo rola. Os botões do rodapé ficam à direita no desktop;
 * `footerFull` usa a largura toda (rodapé com mais de um controle, como quantidade + adicionar).
 */
export function Dialog({ open, onClose, title, description, children, footer, footerFull, size = 'md', className }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; footerFull?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const panel = useModal(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid items-end sm:place-items-center sm:p-4">
      <div className="absolute inset-0 animate-fade bg-navy/55" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-rise flex-col rounded-t-panel bg-surface shadow-pop outline-none sm:rounded-panel',
          { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[760px]' }[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div className="grid gap-1">
            <h2 id={id}>{title}</h2>
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Fechar" size="sm" onClick={onClose} data-close />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <div className="border-t border-line px-6 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className={cn('grid auto-cols-fr grid-flow-col gap-2', !footerFull && 'sm:ml-auto sm:w-fit sm:min-w-[60%]')}>{footer}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Painel lateral (detalhe de pedido, conta, loja). No celular ocupa a tela toda. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number }) {
  const panel = useModal(open, onClose);
  const id = useId();
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade bg-navy/45" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full animate-slide-in flex-col bg-surface shadow-pop outline-none" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="grid min-w-0 gap-1">
            <h2 id={id} className="truncate">
              {title}
            </h2>
            {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Fechar" size="sm" onClick={onClose} data-close />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="grid auto-cols-fr grid-flow-col gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ── confirmação com motivo opcional

interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  /** pede um motivo (obrigatório, 3+ caracteres) e devolve o texto */
  reason?: { label: string; placeholder?: string };
}
type ConfirmFn = (o: ConfirmOptions) => Promise<string | true | null>;
const ConfirmCtx = createContext<ConfirmFn>(async () => null);

/** `const confirm = useConfirm(); const reason = await confirm({ title, reason: {label} })` */
export const useConfirm = () => useContext(ConfirmCtx);

function ConfirmHost({ state, close }: { state: (ConfirmOptions & { resolve: (v: string | true | null) => void }) | null; close: () => void }) {
  const [text, setText] = useState('');
  useEffect(() => setText(''), [state]);
  if (!state) return null;
  const done = (v: string | true | null) => {
    state.resolve(v);
    close();
  };
  const needsReason = !!state.reason;
  const valid = !needsReason || text.trim().length >= 3;
  return (
    <Dialog
      open
      size="sm"
      onClose={() => done(null)}
      title={state.title}
      description={state.description}
      footer={
        <>
          <Button variant="outline" onClick={() => done(null)}>
            Voltar
          </Button>
          <Button variant={state.tone === 'danger' ? 'danger' : 'primary'} disabled={!valid} onClick={() => done(needsReason ? text.trim() : true)}>
            {state.confirmLabel ?? 'Confirmar'}
          </Button>
        </>
      }
    >
      {state.reason && (
        <Field label={state.reason.label} hint="Quem for afetado vai ver este texto">
          {(p) => <Textarea {...p} data-autofocus value={text} onChange={(e) => setText(e.target.value)} placeholder={state.reason!.placeholder} maxLength={300} />}
        </Field>
      )}
    </Dialog>
  );
}

// ── avisos rápidos (toasts)

type ToastTone = 'success' | 'error' | 'info' | 'warn';
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: ReactNode;
  body?: ReactNode;
  onClick?: () => void;
}
interface ToastApi {
  show: (t: Omit<ToastItem, 'id'>) => void;
  success: (title: ReactNode, body?: ReactNode) => void;
  error: (title: ReactNode, body?: ReactNode) => void;
}
const ToastCtx = createContext<ToastApi | null>(null);
export const useToast = () => useContext(ToastCtx)!;

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info, warn: TriangleAlert };
const TOAST_TONE = { success: 'text-success', error: 'text-danger', info: 'text-info', warn: 'text-warn' };

/** Envolve o app: fornece useToast() e useConfirm() */
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirm] = useState<(ConfirmOptions & { resolve: (v: string | true | null) => void }) | null>(null);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === 'error' ? 7000 : 5000);
    },
    [dismiss],
  );
  const api = useRef<ToastApi>({ show, success: (title, body) => show({ tone: 'success', title, body }), error: (title, body) => show({ tone: 'error', title, body }) });
  const confirm = useCallback<ConfirmFn>((o) => new Promise((resolve) => setConfirm({ ...o, resolve })), []);

  return (
    <ToastCtx.Provider value={api.current}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        <ConfirmHost state={confirmState} close={() => setConfirm(null)} />
        {createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] grid justify-items-center gap-2 p-4 sm:justify-items-end" aria-live="polite">
            {toasts.map((t) => {
              const Icon = TOAST_ICON[t.tone];
              return (
                <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop">
                  <Icon size={20} className={cn('mt-0.5 shrink-0', TOAST_TONE[t.tone])} aria-hidden />
                  <button type="button" className={cn('grid min-w-0 flex-1 gap-0.5 text-left', !t.onClick && 'cursor-default')} onClick={() => (t.onClick?.(), dismiss(t.id))}>
                    <strong className="text-sm text-ink">{t.title}</strong>
                    {t.body && <span className="text-[13px] text-muted">{t.body}</span>}
                  </button>
                  <button type="button" onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="text-subtle hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
