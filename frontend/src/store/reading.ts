import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  STORAGE_KEYS,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_LINE_HEIGHT,
  MAX_LINE_HEIGHT,
} from '@/constants';

type FontFamily = 'sans' | 'serif' | 'display';
type BackgroundColor = 'default' | 'sepia' | 'dark' | 'green';
type ReadingMode = 'scroll' | 'page';

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  backgroundColor: BackgroundColor;
  readingMode: ReadingMode;
  showParagraphNumbers: boolean;
}

interface ReadingProgress {
  workId: string;
  chapterId: string;
  paragraphIndex: number;
  scrollPosition: number;
  lastReadAt: string;
}

interface ReadingState {
  settings: ReadingSettings;
  progress: Record<string, ReadingProgress>; // keyed by workId

  // Settings actions
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: FontFamily) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setReadingMode: (mode: ReadingMode) => void;
  toggleParagraphNumbers: () => void;
  resetSettings: () => void;

  // Progress actions
  saveProgress: (progress: ReadingProgress) => void;
  getProgress: (workId: string) => ReadingProgress | null;
  clearProgress: (workId: string) => void;
}

const defaultSettings: ReadingSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  fontFamily: 'serif',
  backgroundColor: 'default',
  readingMode: 'scroll',
  showParagraphNumbers: false,
};

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      progress: {},

      setFontSize: (size) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fontSize: Math.min(Math.max(size, MIN_FONT_SIZE), MAX_FONT_SIZE),
          },
        })),

      setLineHeight: (height) =>
        set((state) => ({
          settings: {
            ...state.settings,
            lineHeight: Math.min(Math.max(height, MIN_LINE_HEIGHT), MAX_LINE_HEIGHT),
          },
        })),

      setFontFamily: (family) =>
        set((state) => ({
          settings: { ...state.settings, fontFamily: family },
        })),

      setBackgroundColor: (color) =>
        set((state) => ({
          settings: { ...state.settings, backgroundColor: color },
        })),

      setReadingMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, readingMode: mode },
        })),

      toggleParagraphNumbers: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            showParagraphNumbers: !state.settings.showParagraphNumbers,
          },
        })),

      resetSettings: () => set({ settings: defaultSettings }),

      saveProgress: (progress) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [progress.workId]: progress,
          },
        })),

      getProgress: (workId) => get().progress[workId] || null,

      clearProgress: (workId) =>
        set((state) => {
          const newProgress = { ...state.progress };
          delete newProgress[workId];
          return { progress: newProgress };
        }),
    }),
    {
      name: STORAGE_KEYS.READING_SETTINGS,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
