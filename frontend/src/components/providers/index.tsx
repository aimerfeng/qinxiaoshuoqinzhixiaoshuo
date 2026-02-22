'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { AnimatePresenceProvider } from '../animation';
import { ToastContainer } from '../ui';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnimatePresenceProvider>
          {children}
          <ToastContainer />
        </AnimatePresenceProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export { QueryProvider } from './QueryProvider';
export { AuthProvider } from './AuthProvider';
export { AnimatePresenceProvider } from '../animation';
