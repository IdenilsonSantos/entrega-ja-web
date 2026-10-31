import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Dialog, Field, Input } from '../../ds';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/query';
import type { Address } from '../../lib/types';
import { LocationField, type Point } from '../shared/PinMap';

/** Novo endereço ou edição */
export function AddressDialog({ open, onClose, address, onSaved }: { open: boolean; onClose: () => void; address?: Address | null; onSaved?: (a: Address) => void }) {
  const [form, setForm] = useState({ label: 'Casa', street: '', complement: '', reference: '', isDefault: false });
  const [point, setPoint] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ label: address?.label ?? 'Casa', street: address?.street ?? '', complement: address?.complement ?? '', reference: address?.reference ?? '', isDefault: address?.isDefault ?? false });
    setPoint(address ? { lat: address.lat, lng: address.lng } : null);
    setError(null);
  }, [open, address]);

  const save = async () => {
    if (!point) return;
    setBusy(true);
    try {
      const body = { ...form, complement: form.complement || undefined, reference: form.reference || undefined, lat: point.lat, lng: point.lng };
      const saved = address ? await api.put<Address>(`/addresses/${address.id}`, body) : await api.post<Address>('/addresses', body);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={address ? 'Editar endereço' : 'Novo endereço'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!point || form.street.trim().length < 5} onClick={save}>
            Salvar endereço
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <LocationField label="Rua e número" text={form.street} onText={(street) => setForm({ ...form, street })} point={point} onPoint={setPoint} placeholder="Rua Frei Caneca, 500" />
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Complemento" optional>{(p) => <Input {...p} value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} placeholder="Apto 42, bloco B" />}</Field>
          <Field label="Nome do endereço">{(p) => <Input {...p} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Casa, Trabalho" maxLength={40} />}</Field>
        </div>
        <Field label="Ponto de referência" optional>{(p) => <Input {...p} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Portão verde, ao lado da padaria" />}</Field>
        <Checkbox label="Usar como endereço principal" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
      </div>
    </Dialog>
  );
}
