import { useQuery } from '@tanstack/react-query';
import { MailWarning } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, buttonClass, EmptyState, PageLoader, Thumb } from '../../ds';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { STORE_ROLE, STORE_ROLE_HINT } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { StoreRole } from '../../lib/types';
import { AuthLayout } from './AuthLayout';

interface InviteInfo {
  storeName: string;
  storeLogoUrl: string | null;
  email: string;
  role: StoreRole;
  accountExists: boolean;
}

/** /convite/:token — entrar na equipe de uma loja */
export function InvitePage() {
  const { token = '' } = useParams();
  const { me, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const info = useQuery({ queryKey: ['invite', token], queryFn: () => api.get<InviteInfo>(`/invites/${token}`), retry: false });

  if (info.isLoading) return <PageLoader />;
  if (info.error || !info.data)
    return (
      <AuthLayout title="Convite">
        <EmptyState icon={MailWarning} title="Convite inválido ou expirado" description="Peça para quem te convidou gerar um novo link." action={<Link to="/" className={buttonClass({ variant: 'outline' })}>Ir para o início</Link>} />
      </AuthLayout>
    );
  const inv = info.data;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ storeId: string }>(`/invites/${token}/accept`);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate(`/loja/${r.storeId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const wrongAccount = me && (me.email !== inv.email || me.role !== 'MERCHANT');

  return (
    <AuthLayout title="Você foi convidado" subtitle={`Para a equipe de ${inv.storeName}`}>
      <div className="grid gap-5">
        <div className="flex items-center gap-4 rounded-card border border-line p-4">
          <Thumb src={inv.storeLogoUrl} name={inv.storeName} className="size-14" />
          <div className="grid">
            <strong className="text-ink">{inv.storeName}</strong>
            <span className="text-sm text-muted">
              Como <b>{STORE_ROLE[inv.role].toLowerCase()}</b>: {STORE_ROLE_HINT[inv.role].toLowerCase()}
            </span>
          </div>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        {!me ? (
          inv.accountExists ? (
            <Link to={`/entrar?voltar=/convite/${token}`} className={buttonClass({ size: 'lg', full: true })}>
              Entrar como {inv.email}
            </Link>
          ) : (
            <Link to={`/cadastro?convite=${token}&email=${encodeURIComponent(inv.email)}`} className={buttonClass({ size: 'lg', full: true })}>
              Criar conta e entrar na equipe
            </Link>
          )
        ) : wrongAccount ? (
          <>
            <Alert tone="warn">
              Este convite é para <b>{inv.email}</b>. Você entrou como {me.email}.
            </Alert>
            <Button variant="outline" onClick={signOut}>
              Sair e entrar com outra conta
            </Button>
          </>
        ) : (
          <Button size="lg" full loading={busy} onClick={accept}>
            Aceitar convite
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
