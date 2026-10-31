/** Tipos do contrato da API (espelham as respostas de entrega-ja-api) */

export type Role = 'CUSTOMER' | 'COURIER' | 'MERCHANT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';
export type StoreRole = 'OWNER' | 'MANAGER' | 'ATTENDANT';
export type StorePermission = 'orders' | 'menu.availability' | 'menu.edit' | 'store.edit' | 'reports' | 'team' | 'team.owner';
export type StoreStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type VehicleType = 'MOTORCYCLE' | 'BICYCLE' | 'CAR' | 'SCOOTER' | 'WALKING';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'DELIVERED' | 'REJECTED' | 'CANCELLED';
export type PaymentMethod = 'PIX' | 'CARD' | 'CASH';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  statusReason: string | null;
  createdAt: string;
}

export interface CourierProfile {
  userId: string;
  vehicleType: VehicleType;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlate: string | null;
  document: string | null;
  licenseNumber: string | null;
  pixKey: string | null;
  approvedAt: string | null;
  deliveriesCount: number;
  missing?: string[];
}

export interface MyStore {
  id: string;
  name: string;
  logoUrl: string | null;
  status: StoreStatus;
  statusReason: string | null;
  isOpen: boolean;
  role: StoreRole;
  permissions: StorePermission[];
}

export interface Me extends User {
  courier?: CourierProfile;
  stores?: MyStore[];
}

export interface Session {
  token: string;
  user: User;
}

export interface Store {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string;
  lat: number;
  lng: number;
  logoUrl: string | null;
  coverUrl: string | null;
  deliveryFeeCents: number;
  minOrderCents: number;
  prepTimeMin: number;
  deliveryRadiusKm: number;
  isOpen: boolean;
  ratingAvg: number;
  ratingCount: number;
  distanceKm?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  priceCents: number;
}
export interface OptionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrl: string | null;
  available: boolean;
  optionGroups: OptionGroup[];
}

export interface MenuProduct extends Product {
  storeId: string;
  categoryId: string | null;
  position: number;
  moderation: 'VISIBLE' | 'REMOVED';
  moderationReason: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  position: number;
}

export interface StoreDetail extends Store {
  sections: { id: string; name: string; products: Product[] }[];
}

export interface MerchantStore extends Store {
  phone: string | null;
  autoAccept: boolean;
  autoReady: boolean;
  status: StoreStatus;
  statusReason: string | null;
  myRole: StoreRole;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  complement: string | null;
  reference: string | null;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitCents: number;
  options: { group: string; name: string; priceCents: number }[];
  totalCents: number;
  notes?: string;
}

export interface CourierInfo {
  id: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  vehicle: { type: VehicleType; model: string | null; color: string | null; plate: string | null } | null;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  changeForCents: number | null;
  notes: string | null;
  deliveryAddress: string;
  deliveryComplement: string | null;
  deliveryReference: string | null;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm: number;
  createdAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledBy: 'CUSTOMER' | 'STORE' | 'ADMIN' | null;
  cancelReason: string | null;
  rating: number | null;
  ratingComment: string | null;
  store: { id: string; name: string; logoUrl: string | null; address: string; lat: number; lng: number; phone: string | null; prepTimeMin: number };
  /** só para a cliente */
  deliveryCode?: string;
  courier?: CourierInfo | null;
  customer?: { id: string; name: string; phone: string | null };
  courierFeeCents?: number;
  platformFeeCents?: number;
  courierId?: string | null;
  storeId?: string;
  timeline?: { type: string; actorId: string | null; note: string | null; at: string }[];
}

export interface Offer {
  orderId: string;
  number: number;
  storeName: string;
  storeAddress: string;
  storeLat: number;
  storeLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  pickupKm: number | null;
  tripKm: number;
  feeCents: number;
  expiresAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: StoreRole;
  since: string;
}

export interface Invite {
  id: string;
  email: string;
  role: StoreRole;
  expiresAt: string;
  link: string;
}
