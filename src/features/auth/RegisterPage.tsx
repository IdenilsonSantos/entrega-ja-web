import { Bike, ShoppingBag, Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, Input, OptionCard, Select } from '../../ds';
import { api } from '../../lib/api';
import { HOME, useAuth } from '../../lib/auth';
import { VEHICLE } from '../../lib/format';
import type { Role, Session, VehicleType } from '../../lib/types';
import { AuthLayout } from './AuthLayout';

const KINDS: { role: Role; label: string; description: string; icon: typeof Bike }[] = [
  { role: 'CUSTOMER', label: 'Quero pedir', description: 'Peça das lojas perto de você', icon: ShoppingBag },
  { role: 'MERCHANT', label: 'Tenho uma loja', description: 'Venda pelo app e gerencie sua equipe', icon: Store },
  { role: 'COURIER', label: 'Quero entregar', description: 'Faça entregas e receba por corrida', icon: Bike },
];

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invite = params.get('convite');
  const [role, setRole] = useState<Role>(invite ? 'MERCHANT' : ((params.get('tipo') as Role) ?? 'CUSTOMER'));
  const [form, setForm] = useState({ name: '', email: params.get('email') ?? '', phone: '', password: '' });
  const [vehicleType, setVehicle] = useState<VehicleType>('MOTORCYCLE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api.post<Session>('/auth/register', { ...form, role, ...(role === 'COURIER' && { vehicleType }), ...(invite && { inviteToken: invite }) });
      const me = await signIn(s);
      navigate(me.role === 'COURIER' ? '/entregador/perfil' : HOME[me.role], { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Criar conta" subtitle={invite ? 'Crie sua conta para entrar na equipe da loja.' : 'Leva menos de um minuto.'}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        {!invite && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold text-ink">Tipo de conta</legend>
            {KINDS.map((k) => (
              <OptionCard key={k.role} name="role" checked={role === k.role} onChange={() => setRole(k.role)} label={k.label} description={k.description} icon={<k.icon size={22} className="shrink-0 text-primary-text" aria-hidden />} />
            ))}
          </fieldset>
        )}
        <Field label="Nome completo">{(p) => <Input {...p} required autoComplete="name" value={form.name} onChange={set('name')} />}</Field>
        <Field label="E-mail">{(p) => <Input {...p} type="email" required autoComplete="email" value={form.email} onChange={set('email')} readOnly={!!invite && !!params.get('email')} />}</Field>
        <Field label="Telefone" optional={role === 'CUSTOMER'}>
          {(p) => <Input {...p} inputMode="tel" autoComplete="tel" required={role !== 'CUSTOMER'} value={form.phone} onChange={set('phone')} placeholder="(11) 90000-0000" />}
        </Field>
        {role === 'COURIER' && (
          <Field label="Veículo" hint="Depois do cadastro você completa modelo, placa e documentos.">
            {(p) => (
              <Select {...p} value={vehicleType} onChange={(e) => setVehicle(e.target.value as VehicleType)}>
                {Object.entries(VEHICLE).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Senha" hint="Pelo menos 6 caracteres">{(p) => <Input {...p} type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} />}</Field>
        <Button type="submit" size="lg" full loading={busy}>
          Criar conta
        </Button>
        <p className="text-center text-sm text-muted">
          Já tem conta? <Link to={invite ? `/entrar?voltar=/convite/${invite}` : '/entrar'}>Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
