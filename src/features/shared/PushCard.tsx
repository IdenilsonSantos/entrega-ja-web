import { BellOff, BellRing, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Switch, useToast } from '../../ds';
import { api } from '../../lib/api';
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push';

/**
 * Ligar e desligar as notificações push deste navegador, com botão de teste.
 * `compact`: só aparece (como convite) enquanto estiver desligado.
 */
export function PushCard({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    pushState().then(setState);
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      const s = on ? await enablePush() : await disablePush();
      setState(s);
      if (s === 'on') toast.success('Notificações ligadas', 'Você vai receber os avisos mesmo com o site fechado.');
      if (s === 'denied') toast.error('Notificações bloqueadas', 'Libere nas configurações do navegador (ícone do cadeado na barra de endereço).');
    } catch (e) {
      toast.error('Não foi possível ligar as notificações', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    const r = await api.post<{ web: number; native: number }>('/push/test');
    toast.success('Teste enviado', `${r.web} navegador(es) e ${r.native} celular(es) inscritos.`);
  };

  if (!state) return null;
  if (compact) {
    if (state !== 'off') return null;
    return (
      <Alert tone="primary" title="Receba os avisos na hora" className="mb-4" action={<Button size="sm" loading={busy} onClick={() => toggle(true)}>Ativar</Button>}>
        Ative as notificações deste navegador para não perder pedidos e entregas.
      </Alert>
    );
  }
  return (
    <Card className="grid gap-4">
      <div className="flex items-center gap-3">
        {state === 'on' ? <BellRing className="text-success" /> : <BellOff className="text-muted" />}
        <div className="grid">
          <h3>Notificações neste navegador</h3>
          <p className="text-[13px] text-muted">Avisos de pedidos, corridas e da sua conta, mesmo com o site fechado.</p>
        </div>
      </div>
      {state === 'unsupported' ? (
        <Alert tone="warn">Este navegador não aceita notificações push (no iPhone, adicione o site à tela de início primeiro).</Alert>
      ) : state === 'denied' ? (
        <Alert tone="warn">As notificações estão bloqueadas. Libere nas configurações do navegador e recarregue a página.</Alert>
      ) : (
        <Switch checked={state === 'on'} disabled={busy} onChange={toggle} label={state === 'on' ? 'Ligadas' : 'Desligadas'} />
      )}
      <Button variant="outline" size="sm" icon={Send} onClick={test} className="justify-self-start">
        Enviar notificação de teste
      </Button>
    </Card>
  );
}
