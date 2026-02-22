'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/** Animation preset types for page transitions */
export type PageTransitionVariant =
  | 'fade'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scale';

interface PageTransitionProps {
  children: ReactNode;
  /** Animation variant to use */
  variant?: PageTransitionVariant;
  /** Custom animation duration in seconds */
  duration?: number;
  /** Custom delay before animation starts */
  delay?: number;
  /** Additional CSS classes */
  className?: string;
}

/** Spring physics configuration for smooth animations */
const springConfig = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
};

/** Animation variants for different transition types */
const pageVariants: Record<PageTransitionVariant, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

/**
 * Page transition component for enter/exit animations.
 * Provides smooth transitions between pages with various animation presets.
 *
 * @example
 * ```tsx
 * <PageTransition variant="slideUp">
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  variant = 'fade',
  duration = 0.3,
  delay = 0,
  className,
}: PageTransitionProps) {
  const variants = pageVariants[variant];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{
        ...springConfig,
        duration,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
