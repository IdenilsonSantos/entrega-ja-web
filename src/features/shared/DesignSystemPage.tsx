import { Bell, Bike, Plus, Search, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Alert, Avatar, Badge, BarChart, Button, Card, Checkbox, Chip, Dialog, Divider, EmptyState, Field, IconButton, Input, LiveDot,
  MoneyInput, OptionCard, Rating, SearchInput, Segmented, Select, Skeleton, Stat, StarInput, Stepper, Switch, Tabs, Textarea, Thumb, useConfirm, useToast,
} from '../../ds';
import { OrderStatusBadge, OrderSteps } from './order';
import { Plate } from './Plate';
import { Wordmark } from './Shell';

const COLORS = [
  ['primary', 'Ação principal, marca'],
  ['primary-text', 'Texto laranja (contraste AA)'],
  ['primary-soft', 'Seleção suave'],
  ['navy', 'Superfícies escuras, botão secundário forte'],
  ['ink', 'Títulos'],
  ['text', 'Texto'],
  ['muted', 'Texto secundário'],
  ['subtle', 'Placeholder, ícones apagados'],
  ['line', 'Divisórias e bordas'],
  ['field', 'Campos'],
  ['canvas', 'Fundo dos painéis'],
  ['success', 'Entregue, online'],
  ['warn', 'Atenção, atraso'],
  ['info', 'Informação'],
  ['danger', 'Erro, recusa, bloqueio'],
];

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="grid gap-4 border-t border-line py-10">
      <div>
        <h2>{title}</h2>
        {note && <p className="mt-1 max-w-2xl text-sm text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** /design-system — catálogo vivo dos tokens e componentes de src/ds */
export default function DesignSystemPage() {
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [tab, setTab] = useState<'x' | 'y' | 'z'>('x');
  const [on, setOn] = useState(true);
  const [qty, setQty] = useState(2);
  const [stars, setStars] = useState(4);
  const [price, setPrice] = useState<number | null>(3290);
  const [dialog, setDialog] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Wordmark />
      <h1 className="mt-6 text-[34px]">Design system</h1>
      <p className="mt-2 max-w-2xl text-muted">Tokens em <code>src/index.css</code> e componentes em <code>src/ds</code>. Toda tela usa só estas peças; para mudar a marca, troque as variáveis de cor.</p>

      <Section title="Cores" note="Classes do Tailwind geradas a partir das variáveis (bg-primary, text-ink, border-line…). O modo escuro troca só as variáveis.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLORS.map(([name, use]) => (
            <div key={name} className="grid gap-1.5">
              <span className="h-14 rounded-field border border-line" style={{ background: `var(--c-${name})` }} />
              <code className="text-[13px] font-bold text-ink">{name}</code>
              <span className="text-xs text-muted">{use}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia" note="Fonte única: Sen (400, 700, 800). Números de preço e tempo com algarismos tabulares.">
        <div className="grid gap-3">
          <h1 className="text-[34px]">Título de página 34</h1>
          <h1>Título 26</h1>
          <h2>Seção 20</h2>
          <h3>Subtítulo 17</h3>
          <p>Texto 15, para leitura corrida e descrições.</p>
          <p className="text-sm text-muted">Texto secundário 14 e 13</p>
          <p className="text-[34px] font-extrabold text-ink tabular-nums">R$ 1.234,90</p>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline" icon={Plus}>Contorno</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="dark">Escuro</Button>
          <Button variant="success">Confirmar entrega</Button>
          <Button variant="danger" icon={Trash2}>Apagar</Button>
          <Button loading>Salvando</Button>
          <Button disabled>Desativado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="lg">Grande</Button>
          <IconButton icon={Bell} label="Notificações" />
          <IconButton icon={Search} label="Buscar" variant="ghost" />
          <IconButton icon={Bike} label="Entregador" variant="dark" />
        </div>
      </Section>

      <Section title="Formulário">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">{(p) => <Input {...p} placeholder="Como aparece para os clientes" />}</Field>
          <Field label="E-mail" error="E-mail inválido">{(p) => <Input {...p} defaultValue="carla@" />}</Field>
          <Field label="Preço" hint="Em reais">{(p) => <MoneyInput {...p} value={price} onChange={setPrice} />}</Field>
          <Field label="Seção">{(p) => <Select {...p}><option>Lanches</option><option>Bebidas</option></Select>}</Field>
          <Field label="Observação" optional className="sm:col-span-2">{(p) => <Textarea {...p} placeholder="Sem cebola" />}</Field>
          <SearchInput placeholder="Buscar loja ou prato" aria-label="Buscar" />
          <Input suffix="min" defaultValue={30} aria-label="Tempo" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox label="Disponível para venda" description="Desmarque quando acabar" defaultChecked />
          <Switch checked={on} onChange={setOn} label="Aceitar pedidos automaticamente" />
          <OptionCard name="ds-pay" defaultChecked label="Pix" description="O entregador mostra o QR code" />
          <OptionCard name="ds-pay" label="Dinheiro" description="Diga se precisa de troco" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="Período" value={seg} onChange={setSeg} options={[{ value: 'a', label: '7 dias' }, { value: 'b', label: '30 dias' }]} />
          <Stepper value={qty} onChange={setQty} />
          <Chip active>Tudo</Chip>
          <Chip>Pizza</Chip>
          <StarInput value={stars} onChange={setStars} />
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'x', label: 'Abertas', count: 3 }, { value: 'y', label: 'Resolvidas' }, { value: 'z', label: 'Arquivadas' }]} />
      </Section>

      <Section title="Exibição">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutro</Badge>
          <Badge tone="primary">Principal</Badge>
          <Badge tone="success">Aprovada</Badge>
          <Badge tone="warn">Em análise</Badge>
          <Badge tone="danger">Suspensa</Badge>
          <Badge tone="dark">Dono</Badge>
          <OrderStatusBadge status="PREPARING" />
          <LiveDot />
          <Rating value={4.7} count={128} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Carla Cliente" size={48} />
          <Thumb name="Burger da Vila" className="size-16" />
          <Plate plate="FUN4D23" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Faturamento" value="R$ 1.322,30" hint="Últimos 7 dias" />
          <Stat label="Pedidos" value={23} />
          <Card><Skeleton className="mb-2 h-5 w-1/2" /><Skeleton className="h-16" /></Card>
        </div>
        <Card><OrderSteps status="READY" /></Card>
        <Card><BarChart label="Exemplo" data={[3, 5, 2, 8, 6, 9, 4].map((v, i) => ({ label: `D${i + 1}`, value: v }))} height={120} /></Card>
        <div className="grid gap-2">
          <Alert tone="info" title="Informação">A busca automática continua.</Alert>
          <Alert tone="success">Entrega confirmada.</Alert>
          <Alert tone="warn" title="Loja em análise">Monte o cardápio enquanto isso.</Alert>
          <Alert tone="danger">Código incorreto.</Alert>
        </div>
        <Card><EmptyState icon={Bike} title="Nenhuma entrega ainda" description="As corridas concluídas aparecem aqui." /></Card>
      </Section>

      <Section title="Sobreposições" note="Modal (painel que sobe no celular), painel lateral, confirmação com motivo e avisos rápidos.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setDialog(true)}>Abrir modal</Button>
          <Button variant="outline" onClick={() => confirm({ title: 'Recusar o pedido #4821?', tone: 'danger', confirmLabel: 'Recusar', reason: { label: 'Motivo' } })}>Confirmação com motivo</Button>
          <Button variant="outline" onClick={() => toast.success('Produto salvo', 'Já aparece no cardápio.')}>Aviso rápido</Button>
        </div>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Modal" footer={<Button onClick={() => setDialog(false)}>Fechar</Button>}>
          <p>Conteúdo do modal. Fecha com Esc ou clicando fora; o foco fica preso dentro.</p>
        </Dialog>
      </Section>
      <Divider />
    </div>
  );
}
