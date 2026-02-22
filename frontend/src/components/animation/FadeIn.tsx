'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode, CSSProperties } from 'react';

interface FadeInProps {
  children: ReactNode;
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
}

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/**
 * Simple fade-in animation component.
 * Fades content from opacity 0 to 1.
 *
 * @example
 * ```tsx
 * <FadeIn delay={0.2}>
 *   <Card>Content</Card>
 * </FadeIn>
 * ```
 */
export function FadeIn({
  children,
  duration = 0.4,
  delay = 0,
  once = true,
  className,
  style,
  as = 'div',
}: FadeInProps) {
  const Component = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={fadeVariants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing for smooth fade
      }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}
