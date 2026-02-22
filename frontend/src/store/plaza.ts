import { create } from 'zustand';
import type { CardItem, FeedType, FeedMeta } from '@/types/plaza';

interface PlazaState {
  // Feed state
  feedType: FeedType;
  cards: CardItem[];
  nextCursor: string | null;
  meta: FeedMeta | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  setFeedType: (type: FeedType) => void;
  setCards: (cards: CardItem[]) => void;
  appendCards: (cards: CardItem[]) => void;
  prependCards: (cards: CardItem[]) => void;
  setNextCursor: (cursor: string | null) => void;
  setMeta: (meta: FeedMeta | null) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Card operations
  updateCard: (cardId: string, updates: Partial<CardItem>) => void;
  removeCard: (cardId: string) => void;
  addCard: (card: CardItem) => void;
  
  // Like operations
  toggleLike: (cardId: string, isLiked: boolean, likeCount: number) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  feedType: 'recommend' as FeedType,
  cards: [],
  nextCursor: null,
  meta: null,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
};

export const usePlazaStore = create<PlazaState>((set) => ({
  ...initialState,

  setFeedType: (type) => set({ feedType: type }),
  
  setCards: (cards) => set({ cards }),
  
  appendCards: (newCards) =>
    set((state) => ({
      cards: [...state.cards, ...newCards],
    })),
  
  prependCards: (newCards) =>
    set((state) => ({
      cards: [...newCards, ...state.cards],
    })),
  
  setNextCursor: (cursor) => set({ nextCursor: cursor }),
  
  setMeta: (meta) => set({ meta }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  
  setError: (error) => set({ error }),
  
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, ...updates } : card,
      ),
    })),
  
  removeCard: (cardId) =>
    set((state) => ({
      cards: state.cards.filter((card) => card.id !== cardId),
    })),
  
  addCard: (card) =>
    set((state) => ({
      cards: [card, ...state.cards],
    })),
  
  toggleLike: (cardId, isLiked, likeCount) =>
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === cardId ? { ...card, isLiked, likeCount } : card,
      ),
    })),
  
  reset: () => set(initialState),
}));
