import { Card, ImagePicker, PageHeader, Switch, useToast } from '../../ds';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/query';
import type { MerchantStore } from '../../lib/types';
import { StoreForm } from './StoreForm';
import { storeKey, useStore } from './storeContext';

/** Dados da loja: capa, logo e informações */
export function SettingsPage() {
  const { store } = useStore();
  const toast = useToast();
  const upload = (kind: 'logo' | 'cover') => async (f: File) => {
    const r = await api.upload<Partial<MerchantStore>>(`/merchant/stores/${store.id}/${kind}`, f);
    queryClient.setQueryData<MerchantStore>(storeKey(store.id), (s) => s && { ...s, ...r });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    toast.success(kind === 'logo' ? 'Logo atualizado' : 'Capa atualizada');
  };
  const saveAuto = async (patch: Partial<MerchantStore>) => {
    queryClient.setQueryData<MerchantStore>(storeKey(store.id), (s) => s && { ...s, ...patch });
    try {
      await api.patch(`/merchant/stores/${store.id}`, patch);
      toast.success('Automação atualizada');
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: storeKey(store.id) });
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Loja" description="Como a loja aparece para os clientes." />
      <section className="mb-8 grid gap-3">
        <h2 className="text-lg">Capa e logo</h2>
        <div className="relative">
          <ImagePicker shape="wide" value={store.coverUrl} label="Enviar capa (1440×560)" onUpload={upload('cover')} />
          <div className="absolute -bottom-8 left-5">
            <ImagePicker shape="circle" value={store.logoUrl} label="Logo" onUpload={upload('logo')} className="size-24 border-4 border-bg bg-field" />
          </div>
        </div>
        <p className="mt-9 text-[13px] text-muted">A capa aparece no topo da página da loja; o logo, na lista de lojas e nos pedidos.</p>
      </section>
      <section className="mb-8 grid gap-3">
        <h2 className="text-lg">Automação</h2>
        <Card className="grid gap-5">
          <Switch
            checked={store.autoAccept}
            onChange={(v) => saveAuto({ autoAccept: v })}
            label="Aceitar pedidos automaticamente"
            description="Pedido novo entra direto em preparo. A equipe continua recebendo o aviso sonoro."
          />
          <Switch
            checked={store.autoReady}
            onChange={(v) => saveAuto({ autoReady: v })}
            label="Marcar como pronto pelo tempo de preparo"
            description={`Depois de ${store.prepTimeMin} min em preparo, o pedido vai para Prontos e o entregador é chamado. Se ficar pronto antes, marque na mão.`}
          />
          <p className="text-[13px] text-muted">Retirada e entrega sempre andam sozinhas: quem confirma é o entregador.</p>
        </Card>
      </section>
      <StoreForm
        initial={store}
        submitLabel="Salvar alterações"
        onSubmit={async (v) => {
          try {
            queryClient.setQueryData(storeKey(store.id), await api.patch<MerchantStore>(`/merchant/stores/${store.id}`, v));
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Loja atualizada');
          } catch (e) {
            toast.error('Não foi possível salvar', (e as Error).message);
          }
        }}
      />
    </div>
  );
}
