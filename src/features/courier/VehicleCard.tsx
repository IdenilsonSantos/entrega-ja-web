import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, CardHeader, Field, Input, OptionCard, useToast } from '../../ds';
import { api } from '../../lib/api';
import { NEEDS_PLATE, VEHICLE } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { CourierProfile, VehicleType } from '../../lib/types';

const LABEL: Record<string, string> = { vehiclePlate: 'placa', licenseNumber: 'CNH', vehicleModel: 'modelo do veículo', document: 'CPF', pixKey: 'chave Pix' };

/** Veículo, documentos e recebimento do entregador */
export function VehicleCard() {
  const toast = useToast();
  const q = useQuery({ queryKey: ['courier', 'profile'], queryFn: () => api.get<CourierProfile>('/courier/profile') });
  const [f, setF] = useState({ vehicleType: 'MOTORCYCLE' as VehicleType, vehicleModel: '', vehicleColor: '', vehiclePlate: '', document: '', licenseNumber: '', pixKey: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const p = q.data;
    if (p) setF({ vehicleType: p.vehicleType, vehicleModel: p.vehicleModel ?? '', vehicleColor: p.vehicleColor ?? '', vehiclePlate: p.vehiclePlate ?? '', document: p.document ?? '', licenseNumber: p.licenseNumber ?? '', pixKey: p.pixKey ?? '' });
  }, [q.data]);
  if (!q.data) return null;
  const plate = NEEDS_PLATE.includes(f.vehicleType);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await api.patch<CourierProfile>('/courier/profile', { ...f, vehiclePlate: plate ? f.vehiclePlate : '', licenseNumber: plate ? f.licenseNumber : f.licenseNumber || '' });
      queryClient.setQueryData(['courier', 'profile'], saved);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Dados salvos', saved.missing?.length ? `Ainda falta: ${saved.missing.map((m) => LABEL[m] ?? m).join(', ')}.` : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="grid gap-5">
      <CardHeader className="mb-0" title="Veículo e documentos" description="Trocar veículo ou documento avisa a plataforma, que pode conferir os dados." />
      {!!q.data.missing?.length && <Alert tone="warn">Para ficar online, preencha: {q.data.missing.map((m) => LABEL[m] ?? m).join(', ')}.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-bold text-ink">Como você entrega</legend>
        {(Object.keys(VEHICLE) as VehicleType[]).map((v) => (
          <OptionCard key={v} name="vehicle" checked={f.vehicleType === v} onChange={() => setF({ ...f, vehicleType: v })} label={VEHICLE[v]} />
        ))}
      </fieldset>
      {f.vehicleType !== 'WALKING' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Modelo">{(p) => <Input {...p} value={f.vehicleModel} onChange={set('vehicleModel')} placeholder="Honda CG 160" />}</Field>
          <Field label="Cor" optional>{(p) => <Input {...p} value={f.vehicleColor} onChange={set('vehicleColor')} placeholder="Vermelha" />}</Field>
          {plate && <Field label="Placa">{(p) => <Input {...p} value={f.vehiclePlate} onChange={(e) => setF({ ...f, vehiclePlate: e.target.value.toUpperCase() })} placeholder="ABC1D23" maxLength={8} className="uppercase" />}</Field>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF">{(p) => <Input {...p} inputMode="numeric" value={f.document} onChange={set('document')} placeholder="000.000.000-00" />}</Field>
        {plate && <Field label="CNH">{(p) => <Input {...p} inputMode="numeric" value={f.licenseNumber} onChange={set('licenseNumber')} placeholder="Número da CNH" />}</Field>}
      </div>
      <Field label="Chave Pix" hint="Onde você recebe o valor das corridas">{(p) => <Input {...p} value={f.pixKey} onChange={set('pixKey')} placeholder="CPF, e-mail, telefone ou chave aleatória" />}</Field>
      <Button className="justify-self-start" loading={busy} onClick={save}>
        Salvar veículo e documentos
      </Button>
    </Card>
  );
}
