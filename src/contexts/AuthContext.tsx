import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'admin' | 'manager' | 'employee' | 'customer';
const ROLES: readonly string[] = ['admin', 'manager', 'employee', 'customer'];

function toRole(value: unknown): Role | null {
  return typeof value === 'string' && ROLES.includes(value) ? (value as Role) : null;
}

async function fetchRole(userId: string): Promise<Role | null> {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
  const role = toRole(data?.role);
  if (role) return role;
  const { data: viewData } = await supabase
    .from('users_with_roles')
    .select('role')
    .eq('id', userId)
    .single();
  return toRole(viewData?.role);
}

interface AuthContextValue {
  user: User | null;
  /** null = no role row found; UI treats as 'employee' via effectiveRole. */
  role: Role | null;
  effectiveRole: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleState, setRoleState] = useState<{ userId: string; role: Role | null } | null>(null);

  const userId = user?.id ?? null;
  const roleLoading = userId !== null && roleState?.userId !== userId;
  const loading = authLoading || roleLoading;
  const role = userId !== null && roleState?.userId === userId ? roleState.role : null;
  const effectiveRole: Role | null = userId === null ? null : (role ?? 'employee');

  // Fetch role outside onAuthStateChange (awaiting supabase calls inside it can deadlock).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchRole(userId)
      .catch(() => null)
      .then((r) => {
        if (active) setRoleState({ userId, role: r });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    // Client always requests "employee"; RLS on user_roles must block self-assigned elevated roles.
    // Insert needs an active session (email confirmation off); otherwise skipped.
    if (data.user && data.session) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role: 'employee' });
      if (roleError) throw roleError;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({ user, role, effectiveRole, loading, signIn, signUp, signOut, refreshUser }),
    [user, role, effectiveRole, loading, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
