'use client';

import React, { createContext, useCallback, useContext } from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Session } from 'next-auth';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const signOut = useCallback(() => {
    nextAuthSignOut({ callbackUrl: '/login' });
  }, []);

  const value: AuthContextValue = {
    session,
    loading: status === 'loading',
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
