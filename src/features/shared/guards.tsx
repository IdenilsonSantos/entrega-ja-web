import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '../../ds';
import { HOME, useAuth } from '../../lib/auth';
import type { Role } from '../../lib/types';

/** Só deixa passar quem tem um dos papéis; sem login, vai para /entrar e volta depois */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!me) return <Navigate to={`/entrar?voltar=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (!roles.includes(me.role)) return <Navigate to={HOME[me.role]} replace />;
  return <>{children}</>;
}
