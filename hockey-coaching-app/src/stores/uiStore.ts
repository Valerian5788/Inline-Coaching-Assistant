import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Games tab UI state
  isCreateGameExpanded: boolean;
  isFiltersExpanded: boolean;
  activeFilterCount: number;
  
  // Actions
  setCreateGameExpanded: (expanded: boolean) => void;
  setFiltersExpanded: (expanded: boolean) => void;
  setActiveFilterCount: (count: number) => void;
  
  // Toggle actions
  toggleCreateGame: () => void;
  toggleFilters: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      isCreateGameExpanded: true, // Expanded by default if no games
      isFiltersExpanded: false,
      activeFilterCount: 0,
      
      // Actions
      setCreateGameExpanded: (expanded) => 
        set({ isCreateGameExpanded: expanded }),
      
      setFiltersExpanded: (expanded) => 
        set({ isFiltersExpanded: expanded }),
      
      setActiveFilterCount: (count) => 
        set({ activeFilterCount: count }),
      
      // Toggle actions
      toggleCreateGame: () => 
        set((state) => ({ isCreateGameExpanded: !state.isCreateGameExpanded })),
      
      toggleFilters: () => 
        set((state) => ({ isFiltersExpanded: !state.isFiltersExpanded })),
    }),
    {
      name: 'hockey-coach-ui-state',
      partialize: (state) => ({
        isCreateGameExpanded: state.isCreateGameExpanded,
        isFiltersExpanded: state.isFiltersExpanded,
      }),
    }
  )
);