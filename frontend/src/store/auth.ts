import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants';
import { authService } from '@/services/auth';

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setHydrated: (isHydrated: boolean) => void;

  // Initialize auth state (check if tokens are valid)
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (token, refreshToken) =>
        set({
          token,
          refreshToken,
        }),

      login: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () => {
        // Call logout API (fire and forget)
        authService.logout().catch(() => {
          // Ignore logout errors
        });

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHydrated: (isHydrated) => set({ isHydrated }),

      /**
       * Initialize auth state on app load
       * 简化逻辑：如果有 user 和 token，直接信任存储的状态
       * 不主动验证 token，让 API 请求时自动处理 401
       */
      initializeAuth: async () => {
        const { token, refreshToken, isHydrated, user, isAuthenticated } = get();

        // Wait for hydration if not yet hydrated
        if (!isHydrated) {
          return;
        }

        // No tokens stored, user is not authenticated
        if (!token && !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // If we already have user data and token, trust the stored state
        // API interceptor will handle 401 and refresh token automatically
        if (user && token && isAuthenticated) {
          set({ isLoading: false });
          return;
        }

        // If we have token but no user data, this is an inconsistent state
        // Clear it and let user re-login
        if (token && !user) {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Default: mark as not loading
        set({ isLoading: false });
      },
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export const useAuthHydration = () => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return isHydrated;
};

export const useIsAuthenticated = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (typeof window === 'undefined' || !isHydrated) {
    return false;
  }

  return isAuthenticated;
};

export const useCurrentUser = () => {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (typeof window === 'undefined' || !isHydrated) {
    return null;
  }

  return user;
};
