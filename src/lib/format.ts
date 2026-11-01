import type { OrderStatus, PaymentMethod, StoreRole, StoreStatus, UserStatus, VehicleType, Role } from './types';
import type { Tone } from '../ds/Display';

export const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const km = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`);

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
/** "agora", "há 5 min", "ontem", depois a data */
export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return 'agora';
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  if (s < 172800) return 'ontem';
  return dateShort(iso);
}
export const dateShort = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
export const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const minutesSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; customer: string }> = {
  PENDING: { label: 'Aguardando loja', tone: 'warn', customer: 'Esperando a loja aceitar' },
  PREPARING: { label: 'Em preparo', tone: 'info', customer: 'A loja está preparando' },
  READY: { label: 'Pronto', tone: 'primary', customer: 'Pronto, entregador a caminho da loja' },
  PICKED_UP: { label: 'Em entrega', tone: 'primary', customer: 'Saiu para entrega' },
  DELIVERED: { label: 'Entregue', tone: 'success', customer: 'Entregue' },
  REJECTED: { label: 'Recusado', tone: 'danger', customer: 'A loja não pôde aceitar' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral', customer: 'Cancelado' },
};
export const ACTIVE: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'PICKED_UP'];
export const isActive = (s: OrderStatus) => ACTIVE.includes(s);

export const PAYMENT: Record<PaymentMethod, string> = { PIX: 'Pix na entrega', CARD: 'Cartão na entrega', CASH: 'Dinheiro' };

export const VEHICLE: Record<VehicleType, string> = { MOTORCYCLE: 'Moto', BICYCLE: 'Bicicleta', CAR: 'Carro', SCOOTER: 'Patinete', WALKING: 'A pé' };
export const NEEDS_PLATE: VehicleType[] = ['MOTORCYCLE', 'CAR'];

export const STORE_ROLE: Record<StoreRole, string> = { OWNER: 'Dono', MANAGER: 'Gerente', ATTENDANT: 'Atendente' };
export const STORE_ROLE_HINT: Record<StoreRole, string> = {
  OWNER: 'Tudo, inclusive equipe e transferir a loja',
  MANAGER: 'Pedidos, cardápio, dados da loja, relatórios e atendentes',
  ATTENDANT: 'Pedidos e disponibilidade dos produtos',
};
export const STORE_STATUS: Record<StoreStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Em análise', tone: 'warn' },
  ACTIVE: { label: 'Aprovada', tone: 'success' },
  SUSPENDED: { label: 'Suspensa', tone: 'danger' },
};
export const USER_STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  PENDING: { label: 'Em análise', tone: 'warn' },
  BLOCKED: { label: 'Bloqueada', tone: 'danger' },
};
export const ROLE: Record<Role, string> = { CUSTOMER: 'Cliente', COURIER: 'Entregador', MERCHANT: 'Lojista', ADMIN: 'Admin' };

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const phoneLink = (p?: string | null) => (p ? `tel:${p.replace(/[^\d+]/g, '')}` : undefined);

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
/** "hoje às 18:00", "amanhã às 11:00", "sáb. às 11:00" */
function when(iso: string) {
  const d = new Date(iso);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = sameDay(d, new Date()) ? 'hoje' : sameDay(d, tomorrow) ? 'amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return `${day} às ${time(iso)}`;
}
/** Situação da loja numa frase: "Abre hoje às 18:00", "Aberta até 23:30", "Fechada" */
export function openLabel(s: { openNow: boolean; opensAt: string | null; closesAt: string | null }) {
  if (s.openNow) return s.closesAt ? `Aberta até ${time(s.closesAt)}` : 'Aberta';
  return s.opensAt ? `Abre ${when(s.opensAt)}` : 'Fechada';
}
/** Horário da semana por dia, de segunda a domingo: [["Segunda", "11:00–15:00, 18:00–23:00"], ["Terça", "Fechado"]…] */
export function weekHours(ranges: { day: number; open: string; close: string }[]) {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const list = ranges.filter((r) => r.day === day).sort((a, b) => a.open.localeCompare(b.open));
    const text = list.map((r) => (r.open === '00:00' && r.close === '00:00' ? '24 horas' : `${r.open}–${r.close}`)).join(', ');
    return [WEEKDAYS[day], text || 'Fechado'] as const;
  });
}
