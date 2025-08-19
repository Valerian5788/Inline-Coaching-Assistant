import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, Team, Season } from '../types';
import { dbHelpers } from '../db';

interface AppStore extends AppState {
  activeSeasonId: string | null;
  // Actions
  setSelectedTeam: (team: Team | null) => void;
  setCurrentSeason: (season: Season | null) => void;
  setActiveSeason: (seasonId: string | null) => void;
  loadActiveSeason: () => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // State
      selectedTeam: null,
      currentSeason: null,
      activeSeasonId: null,

      // Actions
      setSelectedTeam: (team) => set({ selectedTeam: team }),
      setCurrentSeason: (season) => set({ currentSeason: season }),
      setActiveSeason: (seasonId) => set({ activeSeasonId: seasonId }),
      
      loadActiveSeason: async () => {
        const activeSeason = await dbHelpers.getActiveSeason();
        if (activeSeason) {
          set({ 
            currentSeason: activeSeason,
            activeSeasonId: activeSeason.id 
          });
        }
      }
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedTeam: state.selectedTeam,
        currentSeason: state.currentSeason,
        activeSeasonId: state.activeSeasonId
      })
    }
  )
);