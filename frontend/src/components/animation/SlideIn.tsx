'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode, CSSProperties } from 'react';

/** Direction for slide animation */
export type SlideDirection = 'up' | 'down' | 'left' | 'right';

interface SlideInProps {
  children: ReactNode;
  /** Direction to slide from */
  direction?: SlideDirection;
  /** Distance to slide in pixels */
  distance?: number;
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

/** Get slide variants based on direction and distance */
function getSlideVariants(direction: SlideDirection, distance: number): Variants {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const sign = direction === 'up' || direction === 'left' ? 1 : -1;

  return {
    hidden: {
      opacity: 0,
      [axis]: distance * sign,
    },
    visible: {
      opacity: 1,
      [axis]: 0,
    },
  };
}

/**
 * Slide-in animation component with direction support.
 * Slides content from specified direction with fade effect.
 *
 * @example
 * ```tsx
 * // Slide up from below
 * <SlideIn direction="up" distance={30}>
 *   <Card>Content</Card>
 * </SlideIn>
 *
 * // Slide in from right
 * <SlideIn direction="right" delay={0.2}>
 *   <Sidebar />
 * </SlideIn>
 * ```
 */
export function SlideIn({
  children,
  direction = 'up',
  distance = 20,
  duration = 0.4,
  delay = 0,
  once = true,
  className,
  style,
  as = 'div',
}: SlideInProps) {
  const Component = motion[as as keyof typeof motion] as typeof motion.div;
  const variants = getSlideVariants(direction, distance);

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={variants}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration,
        delay,
      }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}
