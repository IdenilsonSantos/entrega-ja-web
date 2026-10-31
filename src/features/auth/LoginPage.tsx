import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, Input } from '../../ds';
import { api } from '../../lib/api';
import { HOME, useAuth } from '../../lib/auth';
import { DEMO_TOOLS } from '../../lib/env';
import type { Session } from '../../lib/types';
import { AuthLayout } from './AuthLayout';

const DEMO = [
  ['Cliente', 'cliente@demo.com'],
  ['Dono da loja', 'loja@demo.com'],
  ['Atendente', 'atendente@demo.com'],
  ['Entregador', 'entregador1@demo.com'],
  ['Admin', 'admin@demo.com'],
];

export function LoginPage() {
  const { me, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (me) return <Navigate to={params.get('voltar') || HOME[me.role]} replace />;

  const submit = async (e?: FormEvent, creds = { email, password }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fresh = await signIn(await api.post<Session>('/auth/login', creds));
      navigate(params.get('voltar') || HOME[fresh.role], { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua conta para pedir, vender ou entregar.">
      <form onSubmit={submit} className="grid gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="E-mail">{(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />}</Field>
        <Field label="Senha">{(p) => <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" size="lg" full loading={busy}>
          Entrar
        </Button>
        <p className="text-center text-sm text-muted">
          Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
      {DEMO_TOOLS && (
        <div className="mt-8 grid gap-2 rounded-card border border-dashed border-line p-4">
          <span className="text-sm font-bold text-ink">Contas de teste <span className="font-normal text-muted">(senha 123456)</span></span>
          <div className="flex flex-wrap gap-2">
            {DEMO.map(([label, mail]) => (
              <Button key={mail} variant="outline" size="sm" disabled={busy} onClick={() => submit(undefined, { email: mail, password: '123456' })}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
