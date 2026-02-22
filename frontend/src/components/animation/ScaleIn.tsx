'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode, CSSProperties } from 'react';

interface ScaleInProps {
  children: ReactNode;
  /** Initial scale value (0-1) */
  initialScale?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay before animation starts in seconds */
  delay?: number;
  /** Whether to animate only when element enters viewport */
  once?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** HTML element to render as */
  as?: keyof JSX.IntrinsicElements;
  /** Transform origin for scale animation */
  origin?: string;
}

/** Get scale variants based on initial scale */
function getScaleVariants(initialScale: number): Variants {
  return {
    hidden: {
      opacity: 0,
      scale: initialScale,
    },
    visible: {
      opacity: 1,
      scale: 1,
    },
  };
}

/**
 * Scale-in animation component for modals, cards, and popups.
 * Scales content from a smaller size with fade effect.
 * Perfect for modal dialogs, card reveals, and attention-grabbing elements.
 *
 * @example
 * ```tsx
 * // Modal dialog
 * <ScaleIn initialScale={0.9} origin="center">
 *   <Modal>Content</Modal>
 * </ScaleIn>
 *
 * // Card reveal
 * <ScaleIn delay={0.1}>
 *   <Card>Content</Card>
 * </ScaleIn>
 * ```
 */
export function ScaleIn({
  children,
  initialScale = 0.95,
  duration = 0.3,
  delay = 0,
  once = true,
  className,
  style,
  as = 'div',
  origin = 'center',
}: ScaleInProps) {
  const Component = motion[as as keyof typeof motion] as typeof motion.div;
  const variants = getScaleVariants(initialScale);

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={variants}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration,
        delay,
      }}
      className={className}
      style={{
        ...style,
        transformOrigin: origin,
      }}
    >
      {children}
    </Component>
  );
}
