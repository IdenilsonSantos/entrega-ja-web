import { useQuery } from '@tanstack/react-query';
import { Bike, CheckCheck, ClipboardList, Flag, LayoutDashboard, ScrollText, SlidersHorizontal, Store, Users } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../../lib/api';
import { AccountPage } from '../shared/AccountPage';
import { PanelShell, type NavItem } from '../shared/Shell';
import { ApprovalsPage } from './ApprovalsPage';
import { AuditPage } from './AuditPage';
import { OrdersPage } from './OrdersPage';
import { OverviewPage } from './OverviewPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';
import { StoresPage } from './StoresPage';
import type { Overview } from './types';
import { UsersPage } from './UsersPage';

export default function AdminArea() {
  // contadores do menu vêm da visão geral (o tempo real mantém atualizado)
  const o = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<Overview>('/admin/overview'), refetchInterval: 60_000 }).data;
  const nav: NavItem[] = [
    { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, count: o?.pending.waitingCourier },
    { to: '/admin/aprovacoes', label: 'Aprovações', icon: CheckCheck, count: o ? o.pending.stores + o.pending.couriers : 0 },
    { to: '/admin/denuncias', label: 'Denúncias', icon: Flag, count: o?.pending.reports },
    { to: '/admin/lojas', label: 'Lojas', icon: Store },
    { to: '/admin/entregadores', label: 'Entregadores', icon: Bike, desktopOnly: true },
    { to: '/admin/contas', label: 'Contas', icon: Users, desktopOnly: true },
    { to: '/admin/auditoria', label: 'Auditoria', icon: ScrollText, desktopOnly: true },
    { to: '/admin/regras', label: 'Regras', icon: SlidersHorizontal, desktopOnly: true },
  ];
  return (
    <PanelShell nav={nav} profileTo="/admin/conta">
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="aprovacoes" element={<ApprovalsPage />} />
        <Route path="denuncias" element={<ReportsPage />} />
        <Route path="lojas" element={<StoresPage />} />
        <Route path="entregadores" element={<UsersPage key="c" role="COURIER" title="Entregadores" />} />
        <Route path="contas" element={<UsersPage key="all" title="Contas" />} />
        <Route path="auditoria" element={<AuditPage />} />
        <Route path="regras" element={<SettingsPage />} />
        <Route path="conta" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </PanelShell>
  );
}
