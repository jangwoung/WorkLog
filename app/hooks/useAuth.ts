'use client';

import { useAuth as useAuthContext } from '@/app/context/AuthContext';

/**
 * Auth state and sign-out. Use within AuthProvider (wrapped by layout).
 */
export function useAuth() {
  return useAuthContext();
}
