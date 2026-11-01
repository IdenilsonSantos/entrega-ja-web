import { useQuery } from '@tanstack/react-query';
import { LinkIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Field, IconCircle, Input, PageLoader, useToast } from '../../ds';
import { api } from '../../lib/api';
import { HOME, useAuth } from '../../lib/auth';
import type { Session } from '../../lib/types';
import { AuthLayout } from './AuthLayout';

/** Aberta pelo link do e-mail: confere o link, pede a senha nova e já entra */
export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const check = useQuery({ queryKey: ['reset', token], queryFn: () => api.get<{ email: string }>(`/auth/reset-password/${token}`), retry: false, staleTime: Infinity });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (check.isLoading) return <PageLoader />;
  if (check.isError) {
    return (
      <AuthLayout title="Link inválido">
        <div className="grid gap-5 text-center">
          <IconCircle icon={LinkIcon} tone="danger" size={56} className="justify-self-center" />
          <p className="text-text">{(check.error as Error).message}</p>
          <Link to="/esqueci-senha" className="justify-self-center">
            Pedir um novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await signIn(await api.post<Session>('/auth/reset-password', { token, password }));
      toast.success('Senha alterada', 'Você já entrou com a senha nova.');
      navigate(HOME[fresh.role], { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Criar nova senha" subtitle={<>Para a conta {check.data?.email}.</>}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Nova senha" hint="Pelo menos 6 caracteres.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" required minLength={6} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Field label="Repita a nova senha" error={mismatch ? 'As senhas não são iguais' : null}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
        <Button type="submit" size="lg" full loading={busy} disabled={mismatch}>
          Salvar e entrar
        </Button>
        <p className="text-center text-sm text-muted">As outras sessões abertas da conta serão encerradas.</p>
      </form>
    </AuthLayout>
  );
}
