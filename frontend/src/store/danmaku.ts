import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Danmaku, DanmakuSettings } from '@/types/reader';
import { DEFAULT_DANMAKU_SETTINGS } from '@/types/reader';

interface DanmakuState {
  // 设置
  settings: DanmakuSettings;

  // 弹幕数据（按 anchorId 分组）
  danmakusByAnchor: Record<string, Danmaku[]>;

  // UI 状态
  isControlsOpen: boolean;
  isInputOpen: boolean;
  currentAnchorId: string | null;

  // 设置操作
  updateSettings: (settings: Partial<DanmakuSettings>) => void;
  resetSettings: () => void;

  // 弹幕数据操作
  setDanmakus: (anchorId: string, danmakus: Danmaku[]) => void;
  addDanmaku: (danmaku: Danmaku) => void;
  removeDanmaku: (anchorId: string, danmakuId: string) => void;
  clearDanmakus: (anchorId?: string) => void;

  // UI 操作
  toggleControls: () => void;
  openInput: (anchorId: string) => void;
  closeInput: () => void;
}

export const useDanmakuStore = create<DanmakuState>()(
  persist(
    (set) => ({
      settings: DEFAULT_DANMAKU_SETTINGS,
      danmakusByAnchor: {},
      isControlsOpen: false,
      isInputOpen: false,
      currentAnchorId: null,

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () => set({ settings: DEFAULT_DANMAKU_SETTINGS }),

      setDanmakus: (anchorId, danmakus) =>
        set((state) => ({
          danmakusByAnchor: {
            ...state.danmakusByAnchor,
            [anchorId]: danmakus,
          },
        })),

      addDanmaku: (danmaku) =>
        set((state) => {
          const existing = state.danmakusByAnchor[danmaku.anchorId] || [];
          return {
            danmakusByAnchor: {
              ...state.danmakusByAnchor,
              [danmaku.anchorId]: [danmaku, ...existing],
            },
          };
        }),

      removeDanmaku: (anchorId, danmakuId) =>
        set((state) => {
          const existing = state.danmakusByAnchor[anchorId] || [];
          return {
            danmakusByAnchor: {
              ...state.danmakusByAnchor,
              [anchorId]: existing.filter((d) => d.id !== danmakuId),
            },
          };
        }),

      clearDanmakus: (anchorId) =>
        set((state) => {
          if (anchorId) {
            const newData = { ...state.danmakusByAnchor };
            delete newData[anchorId];
            return { danmakusByAnchor: newData };
          }
          return { danmakusByAnchor: {} };
        }),

      toggleControls: () => set((state) => ({ isControlsOpen: !state.isControlsOpen })),

      openInput: (anchorId) => set({ isInputOpen: true, currentAnchorId: anchorId }),

      closeInput: () => set({ isInputOpen: false, currentAnchorId: null }),
    }),
    {
      name: 'danmaku-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
