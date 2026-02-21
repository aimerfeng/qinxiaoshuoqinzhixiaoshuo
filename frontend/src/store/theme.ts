import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS, THEMES, type ThemeKey } from '@/constants';

interface ThemeState {
  theme: ThemeKey;
  isDarkMode: boolean;

  // Actions
  setTheme: (theme: ThemeKey) => void;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      isDarkMode: false,

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', THEMES[theme]);
        }
      },

      toggleDarkMode: () =>
        set((state) => {
          const newDarkMode = !state.isDarkMode;
          // Apply dark mode to document
          if (typeof document !== 'undefined') {
            if (newDarkMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
          return { isDarkMode: newDarkMode };
        }),

      setDarkMode: (isDark) => {
        set({ isDarkMode: isDark });
        // Apply dark mode to document
        if (typeof document !== 'undefined') {
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
    }),
    {
      name: STORAGE_KEYS.THEME,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
