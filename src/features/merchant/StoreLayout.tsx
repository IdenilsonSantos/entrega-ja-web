import { BarChart3, ClipboardList, Settings, Store as StoreIcon, UtensilsCrossed, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, PageLoader, Select, cn, useToast } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { openLabel } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { MerchantStore } from '../../lib/types';
import { PanelShell, type NavItem } from '../shared/Shell';
import { StoreProvider, storeKey, useMerchantStore } from './storeContext';

/** Abrir e fechar a loja (qualquer pessoa da equipe) */
function OpenToggle({ store }: { store: MerchantStore }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ isOpen: boolean }>(`/merchant/stores/${store.id}/open`, { isOpen: !store.isOpen });
      queryClient.setQueryData<MerchantStore>(storeKey(store.id), (s) => s && { ...s, isOpen: r.isOpen, openNow: r.isOpen && !store.openingHours?.length });
      // com horário, quem sabe se está dentro dele é a API
      queryClient.invalidateQueries({ queryKey: storeKey(store.id) });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const hasHours = !!store.openingHours?.length;
  // ligado, mas fora do horário: abre sozinha na hora certa
  const waiting = store.isOpen && !store.openNow;
  const label = !store.isOpen ? (hasHours ? 'Pausada' : 'Fechada') : waiting ? 'Fora do horário' : 'Aberta';
  const title = !store.isOpen ? 'Clique para abrir' : hasHours ? `${openLabel(store)}. Clique para pausar` : 'Clique para fechar';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={store.isOpen}
      title={title}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-btn border-[1.5px] px-3 text-sm font-bold whitespace-nowrap transition',
        !store.isOpen ? 'border-line bg-surface text-muted hover:border-subtle' : waiting ? 'border-warn bg-warn-soft text-warn' : 'border-success bg-success-soft text-success',
      )}
    >
      <span className={cn('size-2.5 rounded-full', !store.isOpen ? 'bg-subtle' : waiting ? 'bg-warn' : 'bg-success')} aria-hidden />
      {label}
    </button>
  );
}

function StoreSwitcher({ current }: { current: MerchantStore }) {
  const { me } = useAuth();
  const navigate = useNavigate();
  const stores = me?.stores ?? [];
  return (
    <div className="flex items-center gap-2 lg:grid lg:gap-2">
      {stores.length > 1 ? (
        <Select aria-label="Trocar de loja" value={current.id} onChange={(e) => (e.target.value === 'nova' ? navigate('/loja/nova') : navigate(`/loja/${e.target.value}`))} className="h-10 max-w-[150px] min-w-0 text-sm font-bold lg:max-w-none">
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="nova">+ Nova loja</option>
        </Select>
      ) : (
        <strong className="hidden truncate px-1 text-ink lg:block">{current.name}</strong>
      )}
      <OpenToggle store={current} />
    </div>
  );
}

export function StoreLayout({ children }: { children: ReactNode }) {
  const { storeId = '' } = useParams();
  const { me } = useAuth();
  const store = useMerchantStore(storeId);
  const mine = me?.stores?.find((s) => s.id === storeId);
  if (!mine) return <Navigate to="/loja" replace />;
  if (store.isLoading || !store.data) return <PageLoader />;
  const s = store.data;
  const can = (p: string) => mine.permissions.includes(p as never);
  const base = `/loja/${storeId}`;
  const nav: NavItem[] = [
    ...(can('reports') ? [{ to: base, label: 'Painel', icon: BarChart3, end: true }] : []),
    { to: `${base}/pedidos`, label: 'Pedidos', icon: ClipboardList },
    { to: `${base}/cardapio`, label: 'Cardápio', icon: UtensilsCrossed },
    ...(can('team') ? [{ to: `${base}/equipe`, label: 'Equipe', icon: Users }] : []),
    ...(can('store.edit') ? [{ to: `${base}/loja`, label: 'Loja', icon: Settings }] : []),
    ...((me?.stores?.length ?? 0) > 1 ? [{ to: '/loja', label: 'Todas as lojas', icon: StoreIcon, end: true, desktopOnly: true }] : []),
  ];
  return (
    <StoreProvider store={s} permissions={mine.permissions}>
      <PanelShell nav={nav} header={<StoreSwitcher current={s} />} profileTo="/loja/conta">
        {s.status === 'PENDING' && (
          <Alert tone="warn" title="Loja em análise" className="mb-5">
            A plataforma está conferindo os dados. Enquanto isso, monte o cardápio; quando for aprovada, você recebe um aviso e pode abrir a loja.
          </Alert>
        )}
        {s.status === 'SUSPENDED' && (
          <Alert tone="danger" title="Loja suspensa pela plataforma" className="mb-5">
            {s.statusReason ?? 'Fale com o suporte para entender o motivo.'}
          </Alert>
        )}
        {children}
      </PanelShell>
    </StoreProvider>
  );
}
