import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, Game, Shot, GoalAgainst, TeamSide } from '../types';
import { dbHelpers } from '../db';

interface GameStore extends GameState {
  // Actions
  setCurrentGame: (game: Game | null) => void;
  startTracking: () => void;
  stopTracking: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
  addShot: (shot: Omit<Shot, 'id' | 'gameId' | 'timestamp'>) => Promise<void>;
  addGoalAgainst: (goal: Omit<GoalAgainst, 'id' | 'gameId' | 'timestamp'>) => Promise<void>;
  updateGameScore: (homeScore: number, awayScore: number) => Promise<void>;
  updateGamePeriod: (period: number, teamSide: TeamSide) => Promise<void>;
  loadGameData: (gameId: string) => Promise<void>;
  clearGameData: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // State
      currentGame: null,
      isTracking: false,
      isPaused: false,
      startTime: null,
      shots: [],
      goalsAgainst: [],

      // Actions
      setCurrentGame: (game) => set({ currentGame: game }),

      startTracking: () => set({ 
        isTracking: true, 
        isPaused: false, 
        startTime: Date.now() 
      }),

      stopTracking: () => set({ 
        isTracking: false, 
        isPaused: false, 
        startTime: null 
      }),

      pauseTracking: () => set({ isPaused: true }),

      resumeTracking: () => set({ isPaused: false }),

      addShot: async (shotData) => {
        const { currentGame, shots } = get();
        if (!currentGame) return;

        const shot: Shot = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          timestamp: Date.now(),
          ...shotData
        };

        await dbHelpers.createShot(shot);
        set({ shots: [...shots, shot] });
      },

      addGoalAgainst: async (goalData) => {
        const { currentGame, goalsAgainst } = get();
        if (!currentGame) return;

        const goal: GoalAgainst = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          timestamp: Date.now(),
          ...goalData
        };

        await dbHelpers.createGoalAgainst(goal);
        set({ goalsAgainst: [...goalsAgainst, goal] });
      },

      updateGameScore: async (homeScore, awayScore) => {
        const { currentGame } = get();
        if (!currentGame) return;

        const updatedGame = { ...currentGame, homeScore, awayScore };
        await dbHelpers.updateGame(currentGame.id, { homeScore, awayScore });
        set({ currentGame: updatedGame });
      },

      updateGamePeriod: async (period, teamSide) => {
        const { currentGame } = get();
        if (!currentGame) return;

        const updatedGame = { ...currentGame, currentPeriod: period, teamSide };
        await dbHelpers.updateGame(currentGame.id, { currentPeriod: period, teamSide });
        set({ currentGame: updatedGame });
      },

      loadGameData: async (gameId) => {
        const game = await dbHelpers.getGameById(gameId);
        const shots = await dbHelpers.getShotsByGame(gameId);
        const goalsAgainst = await dbHelpers.getGoalsAgainstByGame(gameId);

        set({
          currentGame: game || null,
          shots,
          goalsAgainst
        });
      },

      clearGameData: () => set({
        currentGame: null,
        isTracking: false,
        isPaused: false,
        startTime: null,
        shots: [],
        goalsAgainst: []
      })
    }),
    {
      name: 'game-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentGame: state.currentGame,
        isTracking: state.isTracking,
        isPaused: state.isPaused,
        startTime: state.startTime
      })
    }
  )
);