import { Plus, Store } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Badge, buttonClass, EmptyState, PageHeader, Thumb, VirtualList, useToast } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { STORE_ROLE, STORE_STATUS } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { MerchantStore } from '../../lib/types';
import { StoreForm } from './StoreForm';

/** /loja — lista das lojas da pessoa (com uma só, vai direto para ela) */
export function StoresHome() {
  const { me } = useAuth();
  const stores = me?.stores ?? [];
  if (stores.length === 1) return <Navigate to={`/loja/${stores[0].id}`} replace />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Suas lojas" description="Escolha a loja para ver pedidos, cardápio e equipe." actions={<Link to="/loja/nova" className={buttonClass({ variant: 'outline' })}><Plus size={18} /> Nova loja</Link>} />
      {!stores.length ? (
        <EmptyState icon={Store} title="Você ainda não tem loja" description="Cadastre sua loja ou peça para o dono te convidar para a equipe." action={<Link to="/loja/nova" className={buttonClass()}>Cadastrar loja</Link>} />
      ) : (
        <VirtualList
          items={stores}
          estimate={89}
          className="border-t border-line"
          render={(s) => (
              <Link to={`/loja/${s.id}`} className="flex items-center gap-4 border-b border-line py-4 text-inherit no-underline hover:bg-hover">
                <Thumb src={s.logoUrl} name={s.name} className="size-14" />
                <div className="grid flex-1">
                  <strong className="text-ink">{s.name}</strong>
                  <span className="text-sm text-muted">Você é {STORE_ROLE[s.role].toLowerCase()}</span>
                </div>
                {s.status !== 'ACTIVE' ? <Badge tone={STORE_STATUS[s.status].tone}>{STORE_STATUS[s.status].label}</Badge> : <Badge tone={s.isOpen ? 'success' : 'neutral'}>{s.isOpen ? 'Aberta' : 'Fechada'}</Badge>}
              </Link>
          )}
        />
      )}
    </div>
  );
}

export function NewStorePage() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Cadastrar loja" description="A plataforma confere os dados antes de a loja aparecer para os clientes. Enquanto isso, você já pode montar o cardápio." />
      <StoreForm
        submitLabel="Enviar para análise"
        onSubmit={async (v) => {
          try {
            const s = await api.post<MerchantStore>('/merchant/stores', v);
            await queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Loja enviada para análise', 'Você recebe uma notificação quando for aprovada.');
            navigate(`/loja/${s.id}/cardapio`);
          } catch (e) {
            toast.error('Não foi possível cadastrar', (e as Error).message);
          }
        }}
      />
    </div>
  );
}
