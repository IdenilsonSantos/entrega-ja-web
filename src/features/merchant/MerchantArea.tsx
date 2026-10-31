import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { AccountPage } from '../shared/AccountPage';
import { PanelShell } from '../shared/Shell';
import { DashboardPage } from './DashboardPage';
import { MenuPage } from './MenuPage';
import { OrdersPage } from './OrdersPage';
import { SettingsPage } from './SettingsPage';
import { StoreLayout } from './StoreLayout';
import { NewStorePage, StoresHome } from './StoresHome';
import { TeamPage } from './TeamPage';
import { Store } from 'lucide-react';

/** Painel inicial da loja: quem não vê relatórios cai direto nos pedidos */
function StoreIndex() {
  const { storeId } = useParams();
  const { me } = useAuth();
  const s = me?.stores?.find((x) => x.id === storeId);
  return s?.permissions.includes('reports') ? <DashboardPage /> : <Navigate to="pedidos" replace />;
}

const simple = (el: React.ReactNode) => <PanelShell nav={[{ to: '/loja', label: 'Minhas lojas', icon: Store, end: true }]} profileTo="/loja/conta">{el}</PanelShell>;

export default function MerchantArea() {
  return (
    <Routes>
      <Route index element={simple(<StoresHome />)} />
      <Route path="nova" element={simple(<NewStorePage />)} />
      <Route path="conta" element={simple(<AccountPage />)} />
      <Route
        path=":storeId/*"
        element={
          <StoreLayout>
            <Routes>
              <Route index element={<StoreIndex />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="cardapio" element={<MenuPage />} />
              <Route path="equipe" element={<TeamPage />} />
              <Route path="loja" element={<SettingsPage />} />
              <Route path="configuracoes" element={<Navigate to="../loja" replace />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
          </StoreLayout>
        }
      />
    </Routes>
  );
}
