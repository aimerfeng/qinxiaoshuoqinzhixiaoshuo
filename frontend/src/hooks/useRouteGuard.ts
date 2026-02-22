'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  AUTH_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
  ROUTES,
  STORAGE_KEYS,
  DEFAULT_LOGIN_REDIRECT,
} from '@/constants';

interface UseRouteGuardOptions {
  /**
   * Whether the route requires authentication
   * @default false
   */
  requireAuth?: boolean;

  /**
   * Whether to redirect authenticated users away (for auth pages)
   * @default false
   */
  redirectIfAuthenticated?: boolean;

  /**
   * Custom redirect URL for unauthenticated users
   * @default '/auth/login'
   */
  loginRedirect?: string;

  /**
   * Custom redirect URL for authenticated users
   * @default '/'
   */
  authenticatedRedirect?: string;
}

interface UseRouteGuardReturn {
  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean;

  /**
   * Whether the auth state is still loading
   */
  isLoading: boolean;

  /**
   * Whether the store has been hydrated from localStorage
   */
  isHydrated: boolean;

  /**
   * Whether the user is authorized to view the current route
   */
  isAuthorized: boolean;

  /**
   * Navigate to login page with redirect URL saved
   */
  redirectToLogin: (returnUrl?: string) => void;

  /**
   * Navigate to the saved redirect URL or default
   */
  redirectAfterLogin: () => void;
}

/**
 * Check if a path is an auth route (login, register, etc.)
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is a protected route (requires authentication)
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Save the intended destination URL for redirect after login
 */
export function saveRedirectUrl(url: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEYS.REDIRECT_URL, url);
  }
}

/**
 * Get and clear the saved redirect URL
 */
export function getAndClearRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    const url = sessionStorage.getItem(STORAGE_KEYS.REDIRECT_URL);
    sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_URL);
    return url;
  }
  return null;
}

/**
 * Get the saved redirect URL without clearing it
 */
export function getRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(STORAGE_KEYS.REDIRECT_URL);
  }
  return null;
}

/**
 * Hook for programmatic route protection
 *
 * Use this hook when you need more control over route protection
 * or want to implement custom redirect logic
 *
 * @example
 * ```tsx
 * // Protect a page that requires authentication
 * const { isAuthorized, isLoading } = useRouteGuard({ requireAuth: true });
 *
 * if (isLoading) return <Loading />;
 * if (!isAuthorized) return null; // Will redirect
 *
 * return <ProtectedContent />;
 * ```
 *
 * @example
 * ```tsx
 * // Redirect authenticated users away from auth pages
 * const { isAuthorized, isLoading } = useRouteGuard({ redirectIfAuthenticated: true });
 *
 * if (isLoading) return <Loading />;
 * if (!isAuthorized) return null; // Will redirect
 *
 * return <LoginForm />;
 * ```
 */
export function useRouteGuard(options: UseRouteGuardOptions = {}): UseRouteGuardReturn {
  const {
    requireAuth = false,
    redirectIfAuthenticated = false,
    loginRedirect = ROUTES.AUTH.LOGIN,
    authenticatedRedirect = DEFAULT_LOGIN_REDIRECT,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();

  // Determine if user is authorized based on options
  const isAuthorized = (() => {
    // Still loading, not yet authorized
    if (!isHydrated || isLoading) {
      return false;
    }

    // Requires auth but user is not authenticated
    if (requireAuth && !isAuthenticated) {
      return false;
    }

    // Should redirect authenticated users but user is authenticated
    if (redirectIfAuthenticated && isAuthenticated) {
      return false;
    }

    return true;
  })();

  // Handle redirects
  useEffect(() => {
    if (!isHydrated || isLoading) {
      return;
    }

    // Redirect unauthenticated users to login
    if (requireAuth && !isAuthenticated) {
      saveRedirectUrl(pathname);
      router.replace(loginRedirect);
      return;
    }

    // Redirect authenticated users away from auth pages
    if (redirectIfAuthenticated && isAuthenticated) {
      const redirectUrl = getAndClearRedirectUrl();
      router.replace(redirectUrl || authenticatedRedirect);
    }
  }, [
    isAuthenticated,
    isLoading,
    isHydrated,
    requireAuth,
    redirectIfAuthenticated,
    loginRedirect,
    authenticatedRedirect,
    pathname,
    router,
  ]);

  // Navigate to login with return URL
  const redirectToLogin = useCallback(
    (returnUrl?: string) => {
      saveRedirectUrl(returnUrl || pathname);
      router.push(loginRedirect);
    },
    [pathname, loginRedirect, router]
  );

  // Navigate to saved redirect URL or default
  const redirectAfterLogin = useCallback(() => {
    const redirectUrl = getAndClearRedirectUrl();
    router.push(redirectUrl || authenticatedRedirect);
  }, [authenticatedRedirect, router]);

  return {
    isAuthenticated,
    isLoading,
    isHydrated,
    isAuthorized,
    redirectToLogin,
    redirectAfterLogin,
  };
}
