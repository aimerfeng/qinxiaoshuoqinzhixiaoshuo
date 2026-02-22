'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  AUTH_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
  ROUTES,
  STORAGE_KEYS,
  DEFAULT_LOGIN_REDIRECT,
} from '@/constants';

interface RouteGuardProps {
  children: ReactNode;
}

/**
 * Loading spinner component for auth check state
 */
function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground">正在验证身份...</p>
      </div>
    </div>
  );
}

/**
 * Check if a path is an auth route (login, register, etc.)
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is a protected route (requires authentication)
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Save the intended destination URL for redirect after login
 */
function saveRedirectUrl(url: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEYS.REDIRECT_URL, url);
  }
}

/**
 * Get and clear the saved redirect URL
 */
function getAndClearRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    const url = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_URL);
    sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_URL);
    return url;
  }
  return null;
}

/**
 * RouteGuard component that protects routes based on authentication status
 *
 * Behavior:
 * - Protected routes: Redirects unauthenticated users to login page
 * - Auth routes: Redirects authenticated users to home page
 * - Shows loading spinner during auth check
 * - Preserves intended destination URL for redirect after login
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for hydration and auth check to complete
    if (!isHydrated || isLoading) {
      return;
    }

    const checkAuth = () => {
      const isAuthPath = isAuthRoute(pathname);
      const isProtectedPath = isProtectedRoute(pathname);

      // Case 1: User is authenticated and trying to access auth routes
      // Redirect to home or saved redirect URL
      if (isAuthenticated && isAuthPath) {
        const redirectUrl = getAndClearRedirectUrl();
        router.replace(redirectUrl || DEFAULT_LOGIN_REDIRECT);
        return;
      }

      // Case 2: User is not authenticated and trying to access protected routes
      // Save current URL and redirect to login
      if (!isAuthenticated && isProtectedPath) {
        saveRedirectUrl(pathname);
        router.replace(ROUTES.AUTH.LOGIN);
        return;
      }

      // Case 3: User is authorized to access the current route
      setIsAuthorized(true);
    };

    checkAuth();
  }, [isAuthenticated, isLoading, isHydrated, pathname, router]);

  // Show loading spinner during hydration or auth check
  if (!isHydrated || isLoading) {
    return <AuthLoadingSpinner />;
  }

  // Show loading spinner while checking authorization
  // This prevents flash of protected content
  if (!isAuthorized) {
    const isAuthPath = isAuthRoute(pathname);
    const isProtectedPath = isProtectedRoute(pathname);

    // Only show loading for routes that need auth check
    if ((isAuthenticated && isAuthPath) || (!isAuthenticated && isProtectedPath)) {
      return <AuthLoadingSpinner />;
    }
  }

  return <>{children}</>;
}
