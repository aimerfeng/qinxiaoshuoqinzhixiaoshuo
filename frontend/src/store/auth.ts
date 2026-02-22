import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants';
import { authService, type AuthResponse } from '@/services/auth';

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

  // Token refresh
  refreshAccessToken: () => Promise<boolean>;

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
       * Refresh the access token using the refresh token
       * Returns true if refresh was successful, false otherwise
       */
      refreshAccessToken: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          return false;
        }

        try {
          const response: AuthResponse = await authService.refreshToken({
            refreshToken,
          });

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          });

          return true;
        } catch {
          // Refresh failed, clear auth state
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Initialize auth state on app load
       * Validates stored tokens and refreshes if needed
       */
      initializeAuth: async () => {
        const { token, refreshToken, isHydrated } = get();

        // Wait for hydration if not yet hydrated
        if (!isHydrated) {
          return;
        }

        // No tokens stored, user is not authenticated
        if (!token && !refreshToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // If we have a token, try to get the user profile to validate it
        if (token) {
          try {
            const user = await authService.getProfile();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          } catch {
            // Token might be expired, try to refresh
          }
        }

        // Try to refresh the token
        if (refreshToken) {
          const refreshed = await get().refreshAccessToken();
          if (refreshed) {
            set({ isLoading: false });
            return;
          }
        }

        // All attempts failed, clear auth state
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
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
        // Called when the store has been rehydrated from localStorage
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

/**
 * Hook to check if auth store has been hydrated from localStorage
 * Useful for SSR to avoid hydration mismatches
 */
export const useAuthHydration = () => {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return isHydrated;
};

/**
 * Hook to get authentication status
 * Returns false during SSR and initial hydration to avoid mismatches
 */
export const useIsAuthenticated = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // During SSR or before hydration, always return false
  if (typeof window === 'undefined' || !isHydrated) {
    return false;
  }

  return isAuthenticated;
};

/**
 * Hook to get the current user
 * Returns null during SSR and initial hydration
 */
export const useCurrentUser = () => {
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // During SSR or before hydration, always return null
  if (typeof window === 'undefined' || !isHydrated) {
    return null;
  }

  return user;
};
