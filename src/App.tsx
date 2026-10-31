import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OverlayProvider, PageLoader } from './ds';
import { AuthProvider, useAuth } from './lib/auth';
import { syncPush } from './lib/push';
import { queryClient } from './lib/query';
import { RealtimeProvider } from './lib/realtime';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { InvitePage } from './features/auth/InvitePage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CartProvider } from './features/customer/cart';
import { CartPage } from './features/customer/CartPage';
import { CustomerAccount } from './features/customer/CustomerAccount';
import { CustomerShell } from './features/customer/CustomerShell';
import { HomePage } from './features/customer/HomePage';
import { DeliveryProvider } from './features/customer/location';
import { OrderPage } from './features/customer/OrderPage';
import { OrdersPage } from './features/customer/OrdersPage';
import { StorePage } from './features/customer/StorePage';
import { RequireRole } from './features/shared/guards';

// painéis carregados sob demanda: a cliente não baixa o código do admin
const MerchantArea = lazy(() => import('./features/merchant/MerchantArea'));
const CourierArea = lazy(() => import('./features/courier/CourierArea'));
const AdminArea = lazy(() => import('./features/admin/AdminArea'));
const DesignSystemPage = lazy(() => import('./features/shared/DesignSystemPage'));

const customer = (el: ReactNode, auth = false) => <CustomerShell>{auth ? <RequireRole roles={['CUSTOMER']}>{el}</RequireRole> : el}</CustomerShell>;

/** Quem não é cliente e abre "/" vai para o próprio painel */
function Home() {
  const { me } = useAuth();
  if (me?.role === 'MERCHANT') return <Navigate to="/loja" replace />;
  if (me?.role === 'COURIER') return <Navigate to="/entregador" replace />;
  if (me?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return customer(<HomePage />);
}

function Boot() {
  const { me } = useAuth();
  useEffect(() => {
    if (me) syncPush();
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OverlayProvider>
          <AuthProvider>
            <RealtimeProvider>
              <DeliveryProvider>
                <CartProvider>
                  <Boot />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/entrar" element={<LoginPage />} />
                      <Route path="/cadastro" element={<RegisterPage />} />
                      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                      <Route path="/redefinir-senha/:token" element={<ResetPasswordPage />} />
                      <Route path="/convite/:token" element={<InvitePage />} />
                      <Route path="/design-system" element={<DesignSystemPage />} />
                      <Route path="/" element={<Home />} />
                      <Route path="/lojas/:id" element={customer(<StorePage />)} />
                      <Route path="/sacola" element={customer(<CartPage />)} />
                      <Route path="/pedidos" element={customer(<OrdersPage />, true)} />
                      <Route path="/pedidos/:id" element={customer(<OrderPage />, true)} />
                      <Route path="/conta" element={customer(<CustomerAccount />, true)} />
                      <Route path="/loja/*" element={<RequireRole roles={['MERCHANT']}><MerchantArea /></RequireRole>} />
                      <Route path="/entregador/*" element={<RequireRole roles={['COURIER']}><CourierArea /></RequireRole>} />
                      <Route path="/admin/*" element={<RequireRole roles={['ADMIN']}><AdminArea /></RequireRole>} />
                      <Route path="/perfil" element={<ProfileRedirect />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </CartProvider>
              </DeliveryProvider>
            </RealtimeProvider>
          </AuthProvider>
        </OverlayProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function ProfileRedirect() {
  const { me } = useAuth();
  const to = { CUSTOMER: '/conta', MERCHANT: '/loja/conta', COURIER: '/entregador/perfil', ADMIN: '/admin/conta' } as const;
  return <Navigate to={me ? to[me.role] : '/entrar'} replace />;
}
