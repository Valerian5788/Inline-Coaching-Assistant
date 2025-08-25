import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, Game, Shot, GoalAgainst, TeamSide, GameEvent, GameEventType } from '../types';
import { dbHelpers } from '../db';

interface GameStore extends GameState {
  // Timer
  timerInterval: NodeJS.Timeout | null;
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
  // Game management
  initializeLiveGame: (game: Game) => Promise<void>;
  updateGameStatus: (gameId: string, status: 'planned' | 'live' | 'archived') => Promise<void>;
  endGame: () => Promise<void>;
  // Timer management
  adjustTime: (seconds: number) => void;
  setGameTime: (seconds: number) => void;
  startPeriod: (period: number) => Promise<void>;
  endPeriod: () => Promise<void>;
  // Event management
  addGameEvent: (type: GameEventType, description: string, data?: any) => Promise<void>;
  // Score management  
  addHomeGoal: () => Promise<void>;
  addAwayGoal: () => Promise<void>;
  // Undo functionality
  undoLastShot: () => Promise<boolean>;
  // Timeout management
  useTimeout: () => Promise<void>;
  // Faceoff tracking
  addFaceoffWin: () => Promise<void>;
  addFaceoffLoss: () => Promise<void>;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // State
      currentGame: null,
      isTracking: false,
      isPaused: false,
      startTime: null,
      gameTime: 0,
      periodStartTime: null,
      shots: [],
      goalsAgainst: [],
      events: [],
      timerInterval: null,

      // Actions
      setCurrentGame: (game) => set({ currentGame: game }),

      startTracking: () => {
        const { timerInterval } = get();
        
        // Clear any existing interval
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        // Start new timer interval
        const newInterval = setInterval(() => {
          const { isPaused, currentGame } = get();
          if (!isPaused && currentGame) {
            set(state => ({ gameTime: state.gameTime + 1 }));
          }
        }, 1000);
        
        set({ 
          isTracking: true, 
          isPaused: false, 
          startTime: Date.now(),
          periodStartTime: Date.now(),
          timerInterval: newInterval
        });
      },

      stopTracking: () => {
        const { timerInterval } = get();
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        set({ 
          isTracking: false, 
          isPaused: false, 
          startTime: null,
          periodStartTime: null,
          timerInterval: null
        });
      },

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
        const [game, shots, goalsAgainst, events] = await Promise.all([
          dbHelpers.getGameById(gameId),
          dbHelpers.getShotsByGame(gameId),
          dbHelpers.getGoalsAgainstByGame(gameId),
          dbHelpers.getEventsByGame(gameId)
        ]);

        set({
          currentGame: game || null,
          shots,
          goalsAgainst,
          events
        });
      },

      clearGameData: () => {
        const { timerInterval } = get();
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        set({
          currentGame: null,
          isTracking: false,
          isPaused: false,
          startTime: null,
          gameTime: 0,
          periodStartTime: null,
          shots: [],
          goalsAgainst: [],
          events: [],
          timerInterval: null
        });
      },

      // Game management functions
      initializeLiveGame: async (game) => {
        // Set game status to live
        await dbHelpers.updateGame(game.id, { status: 'live', currentPeriod: 1, homeScore: 0, awayScore: 0 });
        const updatedGame = { ...game, status: 'live' as const, currentPeriod: 1, homeScore: 0, awayScore: 0 };
        
        // Load game data but don't start timer automatically
        await get().loadGameData(game.id);
        set({ 
          currentGame: updatedGame,
          gameTime: 0,
          isTracking: false,
          isPaused: true
        });
        
        // Add game start event but don't auto-start timer
        await get().addGameEvent('game_start', 'Game started');
      },

      updateGameStatus: async (gameId, status) => {
        await dbHelpers.updateGame(gameId, { status });
        const { currentGame } = get();
        if (currentGame && currentGame.id === gameId) {
          set({ currentGame: { ...currentGame, status } });
        }
      },

      endGame: async () => {
        const { currentGame, timerInterval } = get();
        if (!currentGame) return;

        // Add game end event
        await get().addGameEvent('game_end', 'Game ended');
        
        // Stop timer
        if (timerInterval) {
          clearInterval(timerInterval);
        }

        // Update game status to archived
        await dbHelpers.updateGame(currentGame.id, { status: 'archived' });
        
        // Stop tracking and clear data
        set({
          currentGame: { ...currentGame, status: 'archived' },
          isTracking: false,
          isPaused: false,
          startTime: null,
          periodStartTime: null,
          timerInterval: null
        });
      },

      // Timer management
      adjustTime: (seconds) => {
        set(state => ({ 
          gameTime: Math.max(0, state.gameTime + seconds) 
        }));
      },

      setGameTime: (seconds) => {
        set({ gameTime: Math.max(0, seconds) });
      },

      startPeriod: async (period) => {
        const { currentGame } = get();
        if (!currentGame) return;

        // Update game with current period
        await dbHelpers.updateGame(currentGame.id, { currentPeriod: period });
        
        // Add period start event
        await get().addGameEvent('period_start', `Period ${period} started`);
        
        // Don't auto-start tracking - let coach press play button
        
        set(state => ({
          currentGame: { ...state.currentGame!, currentPeriod: period }
        }));
      },

      endPeriod: async () => {
        const { currentGame, timerInterval } = get();
        if (!currentGame || !currentGame.currentPeriod) return;

        // Stop timer
        if (timerInterval) {
          clearInterval(timerInterval);
        }

        // Add period end event
        await get().addGameEvent('period_end', `Period ${currentGame.currentPeriod} ended`);
        
        set({
          isTracking: false,
          isPaused: false,
          timerInterval: null
        });
      },

      // Event management
      addGameEvent: async (type, description, data = null) => {
        const { currentGame, gameTime, events } = get();
        if (!currentGame) return;

        const event: GameEvent = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          type,
          period: currentGame.currentPeriod || 1,
          gameTime,
          timestamp: Date.now(),
          description,
          data
        };

        await dbHelpers.createGameEvent(event);
        set({ events: [...events, event] });
      },

      // Score management
      addHomeGoal: async () => {
        const { currentGame } = get();
        if (!currentGame) return;

        const newScore = (currentGame.homeScore || 0) + 1;
        await get().updateGameScore(newScore, currentGame.awayScore || 0);
        await get().addGameEvent('goal_home', `Home team goal (${newScore}-${currentGame.awayScore || 0})`);
        
        // Pause tracking on goal
        get().pauseTracking();
      },

      addAwayGoal: async () => {
        const { currentGame } = get();
        if (!currentGame) return;

        const newScore = (currentGame.awayScore || 0) + 1;
        await get().updateGameScore(currentGame.homeScore || 0, newScore);
        await get().addGameEvent('goal_away', `Away team goal (${currentGame.homeScore || 0}-${newScore})`);
        
        // Pause tracking on goal
        get().pauseTracking();
      },

      // Undo functionality
      undoLastShot: async () => {
        const { currentGame, shots } = get();
        if (!currentGame || shots.length === 0) return false;

        // Get the last shot
        const lastShot = shots[shots.length - 1];
        
        // Remove from database
        await dbHelpers.deleteShot(lastShot.id);
        
        // Update local state
        set({ shots: shots.slice(0, -1) });
        
        return true;
      },

      // Timeout management
      useTimeout: async () => {
        const { currentGame } = get();
        if (!currentGame || currentGame.timeoutUsed) return;

        // Update game with timeout used
        await dbHelpers.updateGame(currentGame.id, { timeoutUsed: true });
        
        // Add timeout event
        await get().addGameEvent('timeout', 'Timeout used');
        
        // Pause the game
        get().pauseTracking();
        
        // Update local state
        set(state => ({
          currentGame: { ...state.currentGame!, timeoutUsed: true }
        }));
      },

      // Faceoff tracking
      addFaceoffWin: async () => {
        await get().addGameEvent('faceoff_won', 'Faceoff won');
      },

      addFaceoffLoss: async () => {
        await get().addGameEvent('faceoff_lost', 'Faceoff lost');
      }
    }),
    {
      name: 'game-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentGame: state.currentGame,
        isTracking: state.isTracking,
        isPaused: state.isPaused,
        startTime: state.startTime,
        gameTime: state.gameTime,
        periodStartTime: state.periodStartTime
      })
    }
  )
);