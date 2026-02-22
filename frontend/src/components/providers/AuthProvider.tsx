'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component that handles auth state initialization
 * This should wrap the app to ensure auth state is properly initialized
 * after hydration from localStorage
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state after hydration
    if (isHydrated) {
      initializeAuth();
    }
  }, [isHydrated, initializeAuth]);

  return <>{children}</>;
}
