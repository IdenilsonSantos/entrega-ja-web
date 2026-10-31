import { useState } from 'react';
import { Button, Dialog, Field, OptionCard, Textarea, useToast } from '../../ds';
import { api } from '../../lib/api';

const REASONS = [
  ['FOOD_SAFETY', 'Problema com a comida', 'Estragada, mal embalada, risco à saúde'],
  ['WRONG_INFO', 'Informação errada', 'Preço, horário, foto ou descrição'],
  ['BEHAVIOR', 'Comportamento', 'Desrespeito, ameaça, atendimento'],
  ['FRAUD', 'Fraude ou golpe', 'Cobrança indevida, pedido falso'],
  ['OFFENSIVE', 'Conteúdo ofensivo', 'Nome, foto ou texto impróprio'],
  ['OTHER', 'Outro motivo', ''],
] as const;

/** Denunciar loja, produto, pessoa ou pedido para a moderação */
export function ReportDialog({ open, onClose, target }: { open: boolean; onClose: () => void; target: { type: 'STORE' | 'PRODUCT' | 'USER' | 'ORDER'; id: string; name: string } }) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const send = async () => {
    setBusy(true);
    try {
      await api.post('/reports', { targetType: target.type, targetId: target.id, reason, details: details.trim() || undefined });
      toast.success('Denúncia enviada', 'A moderação vai analisar e você recebe a resposta nas notificações.');
      onClose();
      setReason('');
      setDetails('');
    } catch (e) {
      toast.error('Não foi possível enviar', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Denunciar"
      description={target.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={!reason} loading={busy} onClick={send}>
            Enviar denúncia
          </Button>
        </>
      }
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm text-muted">O que aconteceu?</legend>
        {REASONS.map(([v, label, d]) => (
          <OptionCard key={v} name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} label={label} description={d || undefined} />
        ))}
      </fieldset>
      <Field label="Detalhes" optional className="mt-4">
        {(p) => <Textarea {...p} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Conte o que aconteceu, com data e pedido se tiver" />}
      </Field>
    </Dialog>
  );
}
