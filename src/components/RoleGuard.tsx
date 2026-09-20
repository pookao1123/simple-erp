import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  /** Rendered when role not allowed. Defaults to a plain access-denied message. */
  fallback?: ReactNode;
}

// UI-only gate. Real enforcement = RLS now, backend middleware in Phase 5.
export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { effectiveRole, loading } = useAuth();
  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (effectiveRole && allowedRoles.includes(effectiveRole)) return <>{children}</>;
  return <>{fallback ?? <p className="text-sm text-red-600">Access denied</p>}</>;
}
