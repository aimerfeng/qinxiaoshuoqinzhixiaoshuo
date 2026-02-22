/**
 * Animation Components for Project Anima
 *
 * Design language:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - 二次元风格装饰元素
 *
 * Animation presets:
 * - fadeIn: opacity 0 → 1
 * - slideUp: translateY(20px) → 0 with fade
 * - slideDown: translateY(-20px) → 0 with fade
 * - slideLeft: translateX(20px) → 0 with fade
 * - slideRight: translateX(-20px) → 0 with fade
 * - scaleIn: scale(0.95) → 1 with fade
 * - spring physics for smooth animations
 */

export { AnimatePresenceProvider } from './AnimatePresenceProvider';
export { PageTransition, type PageTransitionVariant } from './PageTransition';
export { FadeIn } from './FadeIn';
export { SlideIn, type SlideDirection } from './SlideIn';
export { ScaleIn } from './ScaleIn';
