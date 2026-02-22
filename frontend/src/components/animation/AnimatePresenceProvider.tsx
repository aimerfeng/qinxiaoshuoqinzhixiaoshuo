'use client';

import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface AnimatePresenceProviderProps {
  children: ReactNode;
  /** Mode for AnimatePresence - 'wait' waits for exit before enter, 'sync' runs both simultaneously */
  mode?: 'wait' | 'sync' | 'popLayout';
  /** Initial animation on first render */
  initial?: boolean;
}

/**
 * Global AnimatePresence wrapper for page transitions.
 * Wraps the application to enable exit animations when navigating between pages.
 *
 * Design language: 大圆角、半透明毛玻璃效果、渐变紫蓝主题色
 */
export function AnimatePresenceProvider({
  children,
  mode = 'wait',
  initial = false,
}: AnimatePresenceProviderProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode={mode} initial={initial}>
      <div key={pathname}>{children}</div>
    </AnimatePresence>
  );
}
