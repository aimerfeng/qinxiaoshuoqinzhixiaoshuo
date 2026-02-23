// Custom hooks exports

export {
  useRouteGuard,
  isAuthRoute,
  isProtectedRoute,
  saveRedirectUrl,
  getAndClearRedirectUrl,
  getRedirectUrl,
} from './useRouteGuard';

export { useHotkeys, formatHotkey } from './useHotkeys';
export { useAutoSaveProgress } from './useAutoSaveProgress';
export { useInfiniteScroll } from './useInfiniteScroll';
export { usePullToRefresh } from './usePullToRefresh';
export { useQuoteSelection } from './useQuoteSelection';

// Message hooks
export {
  useConversations,
  useConversation,
  useMessages,
  useUnreadCount,
  useSendMessage,
  useSendDirectMessage,
  useMarkAsRead,
  useCreateConversation,
  messageKeys,
} from './useMessages';

// Unread notifications hook
export { useUnreadNotifications } from './useUnreadNotifications';

// Blacklist hooks
export {
  useBlacklist,
  useInfiniteBlacklist,
  useAddToBlacklist,
  useRemoveFromBlacklist,
  BLACKLIST_QUERY_KEY,
} from './useBlacklist';

// Onboarding hooks
export { useOnboarding } from './useOnboarding';

// Achievement notification hooks (任务24.2.9)
export {
  useAchievementNotifications,
  type AchievementProgressEvent,
  type AchievementUnlockEvent,
  type UseAchievementNotificationsOptions,
  type UseAchievementNotificationsReturn,
} from './useAchievementNotifications';
