// Application constants

export const APP_NAME = 'Project Anima';
export const APP_DESCRIPTION = '二次元创作者和读者的精神家园';

// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Content limits
export const MAX_CHAPTER_LENGTH = 50000; // 50,000 characters per chapter
export const MAX_CARD_LENGTH = 500; // 500 characters per card
export const MAX_COMMENT_LENGTH = 1000; // 1,000 characters per comment
export const MAX_BIO_LENGTH = 200; // 200 characters for user bio

// File upload limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Reading settings defaults
export const DEFAULT_FONT_SIZE = 18;
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 32;
export const DEFAULT_LINE_HEIGHT = 1.8;
export const MIN_LINE_HEIGHT = 1.4;
export const MAX_LINE_HEIGHT = 2.5;

// Theme options
export const THEMES = {
  default: 'starry-fantasy',
  sakura: 'sakura',
  dark: 'dark-night',
  cyberpunk: 'cyberpunk',
  ink: 'ink',
} as const;

export type ThemeKey = keyof typeof THEMES;

// Membership levels
export const MEMBERSHIP_LEVELS = {
  regular: {
    name: '普通会员',
    dailyMustardSeed: 0,
    maxMustardSeed: 0,
  },
  official: {
    name: '正式会员',
    dailyMustardSeed: 10,
    maxMustardSeed: 500,
  },
  senior: {
    name: '资深会员',
    dailyMustardSeed: 20,
    maxMustardSeed: 1000,
  },
  honor: {
    name: '荣誉会员',
    dailyMustardSeed: 50,
    maxMustardSeed: 2000,
  },
} as const;

// Work categories
export const WORK_CATEGORIES = [
  { id: 'fantasy', name: '奇幻' },
  { id: 'romance', name: '言情' },
  { id: 'scifi', name: '科幻' },
  { id: 'mystery', name: '悬疑' },
  { id: 'action', name: '动作' },
  { id: 'comedy', name: '喜剧' },
  { id: 'horror', name: '恐怖' },
  { id: 'slice-of-life', name: '日常' },
  { id: 'isekai', name: '异世界' },
  { id: 'game', name: '游戏' },
] as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'anima_auth_token',
  REFRESH_TOKEN: 'anima_refresh_token',
  USER: 'anima_user',
  THEME: 'anima_theme',
  READING_SETTINGS: 'anima_reading_settings',
  READING_PROGRESS: 'anima_reading_progress',
  REDIRECT_URL: 'anima_redirect_url',
} as const;

// Route configuration
export const ROUTES = {
  // Public routes (accessible to everyone)
  HOME: '/',

  // Auth routes (only for unauthenticated users)
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  // Protected routes (require authentication)
  PROTECTED: {
    PROFILE: '/profile',
    SETTINGS: '/settings',
    CREATOR: '/creator',
    BOOKSHELF: '/bookshelf',
  },
} as const;

// Auth route paths (for checking if current route is an auth route)
export const AUTH_ROUTES = [
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.REGISTER,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
  ROUTES.AUTH.VERIFY_EMAIL,
] as const;

// Protected route prefixes (routes that require authentication)
export const PROTECTED_ROUTE_PREFIXES = [
  '/profile',
  '/settings',
  '/creator',
  '/bookshelf',
] as const;

// Default redirect paths
export const DEFAULT_LOGIN_REDIRECT = ROUTES.HOME;
export const DEFAULT_LOGOUT_REDIRECT = ROUTES.AUTH.LOGIN;
