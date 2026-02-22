'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { CreatorSidebar, CreatorHeader } from '@/components/creator';

interface CreatorLayoutProps {
  children: ReactNode;
}

/**
 * Loading spinner for auth check
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
        <p className="text-sm text-muted-foreground">正在加载创作者中心...</p>
      </div>
    </div>
  );
}

/**
 * Creator Console Layout
 * 
 * Features:
 * - Left sidebar with navigation (collapsible on mobile)
 * - Top header with user info and quick actions
 * - Main content area
 * - Authentication protection (redirects to login if not authenticated)
 */
export default function CreatorLayout({ children }: CreatorLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isHydrated } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle authentication redirect
  useEffect(() => {
    if (isHydrated && !isLoading && !isAuthenticated) {
      // Save current URL for redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('anima_redirect_url', window.location.pathname);
      }
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, isHydrated, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, []);

  // Close sidebar when pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Show loading state during hydration or auth check
  if (!isHydrated || isLoading) {
    return <AuthLoadingSpinner />;
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return <AuthLoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <CreatorSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:ml-0">
        {/* Header */}
        <CreatorHeader onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
