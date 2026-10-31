import { KeyRound, LogOut } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, Field, ImagePicker, Input, PageHeader, useToast } from '../../ds';
import { api, tokenStore } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ROLE } from '../../lib/format';
import { queryClient } from '../../lib/query';
import type { Me, Session } from '../../lib/types';
import { PushCard } from './PushCard';

/** Minha conta: foto, nome, telefone, senha e notificações. `extra` entra no meio (veículo, endereços…). */
export function AccountPage({ extra }: { extra?: ReactNode }) {
  const { me, signOut } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwBusy, setPwBusy] = useState(false);
  if (!me) return null;

  const save = async () => {
    setSaving(true);
    try {
      queryClient.setQueryData(['me'], await api.patch<Me>('/me', { name, phone }));
      toast.success('Dados salvos');
    } catch (e) {
      toast.error('Não foi possível salvar', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwBusy(true);
    try {
      const s = await api.post<Session>('/me/password', pw);
      tokenStore.set(s.token); // as outras sessões caem; esta continua com o token novo
      setPw({ current: '', next: '' });
      toast.success('Senha alterada', 'Você saiu dos outros aparelhos.');
    } catch (e) {
      toast.error('Não foi possível trocar a senha', (e as Error).message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <PageHeader title="Minha conta" description={me.email} actions={<Badge tone="primary">{ROLE[me.role]}</Badge>} />
      <Card className="grid gap-5">
        <div className="flex items-center gap-5">
          <ImagePicker
            shape="circle"
            value={me.avatarUrl}
            label="Foto"
            onUpload={async (f) => {
              const r = await api.upload<{ avatarUrl: string }>('/me/avatar', f);
              queryClient.setQueryData<Me>(['me'], (m) => (m ? { ...m, avatarUrl: r.avatarUrl } : m));
            }}
          />
          <p className="text-sm text-muted">Toque na foto para trocar. Ela aparece para quem acompanha seus pedidos e entregas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
          <Field label="Telefone">{(p) => <Input {...p} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" />}</Field>
        </div>
        <Button className="justify-self-start" loading={saving} disabled={name.trim().length < 2} onClick={save}>
          Salvar dados
        </Button>
      </Card>

      {extra}

      <PushCard />

      <Card>
        <CardHeader title="Senha" description="Ao trocar, você sai dos outros aparelhos." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha atual">{(p) => <Input {...p} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
          <Field label="Nova senha" hint="Pelo menos 6 caracteres">
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}
          </Field>
        </div>
        <Button variant="outline" icon={KeyRound} className="mt-4" loading={pwBusy} disabled={!pw.current || pw.next.length < 6} onClick={changePassword}>
          Trocar senha
        </Button>
      </Card>

      <Button variant="ghost" icon={LogOut} className="justify-self-start" onClick={signOut}>
        Sair da conta
      </Button>
    </div>
  );
}
