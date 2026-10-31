import { Bike, History, UserRound, Wallet } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AccountPage } from '../shared/AccountPage';
import { PanelShell, type NavItem } from '../shared/Shell';
import { CourierHome } from './CourierHome';
import { EarningsPage } from './EarningsPage';
import { HistoryPage } from './HistoryPage';
import { ShiftProvider } from './shift';
import { VehicleCard } from './VehicleCard';

const NAV: NavItem[] = [
  { to: '/entregador', label: 'Corridas', icon: Bike, end: true },
  { to: '/entregador/ganhos', label: 'Ganhos', icon: Wallet },
  { to: '/entregador/historico', label: 'Histórico', icon: History },
  { to: '/entregador/perfil', label: 'Perfil', icon: UserRound },
];

export default function CourierArea() {
  return (
    <ShiftProvider>
      <PanelShell nav={NAV} profileTo="/entregador/perfil">
        <Routes>
          <Route index element={<CourierHome />} />
          <Route path="ganhos" element={<EarningsPage />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="perfil" element={<AccountPage extra={<VehicleCard />} />} />
          <Route path="*" element={<Navigate to="/entregador" replace />} />
        </Routes>
      </PanelShell>
    </ShiftProvider>
  );
}
