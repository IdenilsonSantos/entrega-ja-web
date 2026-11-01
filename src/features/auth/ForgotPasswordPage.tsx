import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Button, Field, IconCircle, Input } from '../../ds';
import { api } from '../../lib/api';
import { AuthLayout } from './AuthLayout';

/** Pede o link por e-mail. A resposta é sempre a mesma, exista a conta ou não. */
export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Confira seu e-mail" subtitle="O link para criar uma nova senha está a caminho.">
        <div className="grid gap-5 text-center">
          <IconCircle icon={MailCheck} tone="success" size={56} className="justify-self-center" />
          <p className="text-text">
            Se houver uma conta com <strong className="text-ink">{email}</strong>, você vai receber um e-mail com o link. Ele vale por 1 hora e só pode ser usado uma vez.
          </p>
          <p className="text-sm text-muted">Não chegou? Olhe a caixa de spam ou peça de novo em alguns minutos.</p>
          <Button variant="outline" full onClick={() => setSent(false)}>
            Usar outro e-mail
          </Button>
          <p className="text-sm text-muted">
            <Link to="/entrar">Voltar para entrar</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci minha senha" subtitle="Informe o e-mail da conta e enviamos um link para criar uma nova senha.">
      <form onSubmit={submit} className="grid gap-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="E-mail">{(p) => <Input {...p} type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />}</Field>
        <Button type="submit" size="lg" full loading={busy}>
          Enviar link
        </Button>
        <p className="text-center text-sm text-muted">
          Lembrou? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
