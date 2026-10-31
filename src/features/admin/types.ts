import type { CourierProfile, MenuProduct, Order, OrderStatus, StoreRole, StoreStatus, User, VehicleType } from '../../lib/types';

export interface Overview {
  today: { orders: number; delivered: number; lost: number; gmv: number; revenue: number; avgMin: number };
  active: Partial<Record<OrderStatus, number>>;
  pending: { stores: number; couriers: number; reports: number; waitingCourier: number };
  couriersOnline: number;
  daily: { day: string; orders: number; gmv: number }[];
}

export interface Candidate {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  online: boolean;
  busy: boolean;
  current: boolean;
  distanceKm: number | null;
  vehicleType: VehicleType | null;
  vehiclePlate: string | null;
}

export interface AdminStore {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string | null;
  logoUrl: string | null;
  status: StoreStatus;
  statusReason: string | null;
  isOpen: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  owner: { id: string; name: string; email: string; phone?: string | null };
}

export interface AdminStoreDetail extends AdminStore {
  description: string | null;
  team: { id: string; userId: string; name: string; email: string; role: StoreRole }[];
  products: MenuProduct[];
  stats30d: { orders: number; delivered: number; lost: number; revenue: number };
  reports: number;
}

export interface AdminUser extends User {
  online?: boolean;
}

export interface AdminUserDetail extends AdminUser {
  courier?: CourierProfile | null;
  earnings?: { total: number; totalCount: number; week: number };
  stores?: { id: string; name: string; status: StoreStatus; role: StoreRole }[];
  orders: { asCustomer: number; asCourier: number };
  reports: number;
}

export interface Report {
  id: string;
  targetType: 'STORE' | 'PRODUCT' | 'USER' | 'ORDER';
  targetId: string;
  targetName: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; name: string; role: string };
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  reason: string | null;
  createdAt: string;
  actor: { id: string; name: string };
}

export type AdminOrder = Order & { deliveryCode?: string };

export const REPORT_REASON: Record<string, string> = {
  OFFENSIVE: 'Conteúdo ofensivo',
  FRAUD: 'Fraude ou golpe',
  WRONG_INFO: 'Informação errada',
  FOOD_SAFETY: 'Problema com a comida',
  BEHAVIOR: 'Comportamento',
  OTHER: 'Outro',
};

export const AUDIT_ACTION: Record<string, string> = {
  'store.approve': 'aprovou a loja',
  'store.suspend': 'suspendeu a loja',
  'store.reactivate': 'reativou a loja',
  'product.remove': 'removeu o produto',
  'product.restore': 'liberou o produto',
  'user.block': 'bloqueou a conta',
  'user.unblock': 'desbloqueou a conta',
  'courier.approve': 'aprovou o entregador',
  'courier.changes': 'pediu ajustes ao entregador',
  'order.assign': 'atribuiu entregador ao pedido',
  'order.unassign': 'tirou o entregador do pedido',
  'order.cancel': 'cancelou o pedido',
  'report.resolve': 'resolveu a denúncia sobre',
  'report.dismiss': 'arquivou a denúncia sobre',
  'settings.update': 'mudou as regras da plataforma',
};
