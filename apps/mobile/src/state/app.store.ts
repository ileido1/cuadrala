import { create } from 'zustand';

export type AppTabId = 'dashboard' | 'create_match' | 'matchmaking' | 'ranking';

type AppFilters = {
  matchmakingMatchId: string;
  matchmakingLimit: number;
  rankingCategoryId: string;
};

type AppStore = {
  activeTab: AppTabId;
  setActiveTab: (_tab: AppTabId) => void;
  lastCreatedMatchId: string | null;
  setLastCreatedMatchId: (_id: string | null) => void;
  filters: AppFilters;
  setFilters: (_partial: Partial<AppFilters>) => void;
};

export const useAppStore = create<AppStore>((_set) => ({
  activeTab: 'dashboard',
  setActiveTab: (_tab) => _set({ activeTab: _tab }),
  lastCreatedMatchId: null,
  setLastCreatedMatchId: (_id) => _set({ lastCreatedMatchId: _id }),
  filters: {
    matchmakingMatchId: '',
    matchmakingLimit: 10,
    rankingCategoryId: '',
  },
  setFilters: (_partial) =>
    _set((_state) => ({
      filters: { ..._state.filters, ..._partial },
    })),
}));
