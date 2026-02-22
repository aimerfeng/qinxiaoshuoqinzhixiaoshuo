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
import type { HotkeyConfig } from '@/types/reader';

type FontFamily = 'sans' | 'serif' | 'display';
type BackgroundColor = 'default' | 'sepia' | 'dark' | 'green';
type ReadingMode = 'scroll' | 'page';
type PageWidth = 'narrow' | 'medium' | 'wide' | 'full';

interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  backgroundColor: BackgroundColor;
  readingMode: ReadingMode;
  showParagraphNumbers: boolean;
  paragraphSpacing: number;
  pageWidth: PageWidth;
  nightMode: boolean;
}

interface ReadingProgress {
  workId: string;
  chapterId: string;
  paragraphIndex: number;
  scrollPosition: number;
  lastReadAt: string;
}

interface UIState {
  isSettingsPanelOpen: boolean;
  isChapterListOpen: boolean;
  isFullscreen: boolean;
  showProgressBar: boolean;
  selectedParagraphId: string | null;
  isParagraphMenuOpen: boolean;
}

interface ReadingState {
  settings: ReadingSettings;
  progress: Record<string, ReadingProgress>; // keyed by workId
  ui: UIState;
  hotkeys: HotkeyConfig[];

  // Settings actions
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: FontFamily) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setPageWidth: (width: PageWidth) => void;
  setParagraphSpacing: (spacing: number) => void;
  toggleParagraphNumbers: () => void;
  toggleNightMode: () => void;
  resetSettings: () => void;

  // Progress actions
  saveProgress: (progress: ReadingProgress) => void;
  getProgress: (workId: string) => ReadingProgress | null;
  clearProgress: (workId: string) => void;

  // UI actions
  toggleSettingsPanel: () => void;
  toggleChapterList: () => void;
  toggleFullscreen: () => void;
  setSelectedParagraph: (id: string | null) => void;
  toggleParagraphMenu: (open?: boolean) => void;
  closeAllPanels: () => void;

  // Hotkey actions
  updateHotkey: (action: string, key: string, modifiers?: string[]) => void;
  resetHotkeys: () => void;
}

const defaultSettings: ReadingSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: DEFAULT_LINE_HEIGHT,
  fontFamily: 'serif',
  backgroundColor: 'default',
  readingMode: 'scroll',
  showParagraphNumbers: false,
  paragraphSpacing: 1.5,
  pageWidth: 'medium',
  nightMode: false,
};

const defaultUIState: UIState = {
  isSettingsPanelOpen: false,
  isChapterListOpen: false,
  isFullscreen: false,
  showProgressBar: true,
  selectedParagraphId: null,
  isParagraphMenuOpen: false,
};

const defaultHotkeys: HotkeyConfig[] = [
  { action: 'nextPage', key: 'ArrowRight', description: '下一页' },
  { action: 'prevPage', key: 'ArrowLeft', description: '上一页' },
  { action: 'nextPage', key: 'ArrowDown', description: '下一页' },
  { action: 'prevPage', key: 'ArrowUp', description: '上一页' },
  { action: 'nextPage', key: ' ', description: '下一页（空格）' },
  { action: 'nextChapter', key: 'ArrowRight', modifiers: ['ctrl'], description: '下一章' },
  { action: 'prevChapter', key: 'ArrowLeft', modifiers: ['ctrl'], description: '上一章' },
  { action: 'toggleSettings', key: 's', description: '打开设置' },
  { action: 'toggleChapterList', key: 'c', description: '打开章节目录' },
  { action: 'toggleNightMode', key: 'n', description: '切换夜间模式' },
  { action: 'toggleFullscreen', key: 'f', description: '切换全屏' },
  { action: 'increaseFontSize', key: '=', modifiers: ['ctrl'], description: '增大字体' },
  { action: 'decreaseFontSize', key: '-', modifiers: ['ctrl'], description: '减小字体' },
  { action: 'goToTop', key: 'Home', description: '回到顶部' },
  { action: 'goToBottom', key: 'End', description: '跳到底部' },
];

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      progress: {},
      ui: defaultUIState,
      hotkeys: defaultHotkeys,

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

      setPageWidth: (width) =>
        set((state) => ({
          settings: { ...state.settings, pageWidth: width },
        })),

      setParagraphSpacing: (spacing) =>
        set((state) => ({
          settings: { ...state.settings, paragraphSpacing: Math.min(Math.max(spacing, 0.5), 3) },
        })),

      toggleParagraphNumbers: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            showParagraphNumbers: !state.settings.showParagraphNumbers,
          },
        })),

      toggleNightMode: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            nightMode: !state.settings.nightMode,
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

      // UI actions
      toggleSettingsPanel: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            isSettingsPanelOpen: !state.ui.isSettingsPanelOpen,
            isChapterListOpen: false, // Close other panels
          },
        })),

      toggleChapterList: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            isChapterListOpen: !state.ui.isChapterListOpen,
            isSettingsPanelOpen: false, // Close other panels
          },
        })),

      toggleFullscreen: () =>
        set((state) => ({
          ui: { ...state.ui, isFullscreen: !state.ui.isFullscreen },
        })),

      setSelectedParagraph: (id) =>
        set((state) => ({
          ui: { ...state.ui, selectedParagraphId: id },
        })),

      toggleParagraphMenu: (open) =>
        set((state) => ({
          ui: {
            ...state.ui,
            isParagraphMenuOpen: open ?? !state.ui.isParagraphMenuOpen,
          },
        })),

      closeAllPanels: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            isSettingsPanelOpen: false,
            isChapterListOpen: false,
            isParagraphMenuOpen: false,
          },
        })),

      // Hotkey actions
      updateHotkey: (action, key, modifiers) =>
        set((state) => ({
          hotkeys: state.hotkeys.map((h) =>
            h.action === action
              ? {
                  ...h,
                  key,
                  modifiers: modifiers as ('ctrl' | 'shift' | 'alt' | 'meta')[] | undefined,
                }
              : h
          ),
        })),

      resetHotkeys: () => set({ hotkeys: defaultHotkeys }),
    }),
    {
      name: STORAGE_KEYS.READING_SETTINGS,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        progress: state.progress,
        hotkeys: state.hotkeys,
      }),
    }
  )
);
