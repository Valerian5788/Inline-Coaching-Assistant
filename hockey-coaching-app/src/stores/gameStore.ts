import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, Game, Shot, GoalAgainst, TeamSide, GameEvent, GameEventType } from '../types';
import { dbHelpers } from '../db';

interface GameStore extends GameState {
  // Timer
  timerInterval: NodeJS.Timeout | null;
  // Local-first sync
  pendingChanges: {
    shots: boolean;
    goalsAgainst: boolean;
    events: boolean;
    gameState: boolean;
  };
  lastSyncTime: number | null;
  isSyncing: boolean;
  // Last action tracking for undo (30 second window)
  lastAction: {
    type: 'shot' | 'goal_against' | 'faceoff_win' | 'faceoff_loss';
    timestamp: number;
    wasGoal?: boolean; // For shots that resulted in goals
  } | null;
  // Actions
  setCurrentGame: (game: Game | null) => void;
  syncToFirebase: () => Promise<void>;
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
  undoLastAction: () => Promise<boolean>;
  canUndo: () => boolean;
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
      // Local-first sync state
      pendingChanges: {
        shots: false,
        goalsAgainst: false,
        events: false,
        gameState: false
      },
      lastSyncTime: null,
      isSyncing: false,
      lastAction: null,

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
            const newGameTime = get().gameTime + 1;

            // Check if period should end automatically
            const periodLength = currentGame.periodMinutes * 60;
            const currentPeriod = currentGame.currentPeriod || 1;
            const periodStartTime = (currentPeriod - 1) * periodLength;
            const periodElapsed = newGameTime - periodStartTime;

            // Auto-pause when period ends
            if (periodElapsed >= periodLength) {
              clearInterval(newInterval);
              set({
                gameTime: newGameTime,
                isTracking: false,
                isPaused: false,
                timerInterval: null
              });
              console.log(`Period ${currentPeriod} completed - timer auto-stopped`);
            } else {
              set({ gameTime: newGameTime });
            }
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

      // Sync pending changes to Firebase
      syncToFirebase: async () => {
        const {
          currentGame,
          shots,
          goalsAgainst,
          events,
          pendingChanges,
          isSyncing
        } = get();

        if (!currentGame || isSyncing) return;

        set({ isSyncing: true });

        try {
          console.log('🔄 Syncing to Firebase...', pendingChanges);

          // Sync shots
          if (pendingChanges.shots && shots.length > 0) {
            const unsyncedShots = shots.filter((shot: any) => !shot.synced);
            if (unsyncedShots.length > 0) {
              await Promise.all(
                unsyncedShots.map((shot: any) => {
                  const { synced, ...shotToSync } = shot;
                  return dbHelpers.createShot(shotToSync);
                })
              );
              // Mark shots as synced
              const syncedShots = shots.map((shot: any) => ({ ...shot, synced: true }));
              set({ shots: syncedShots });
            }
          }

          // Sync goals against
          if (pendingChanges.goalsAgainst && goalsAgainst.length > 0) {
            const unsyncedGoals = goalsAgainst.filter((goal: any) => !goal.synced);
            if (unsyncedGoals.length > 0) {
              await Promise.all(
                unsyncedGoals.map((goal: any) => {
                  const { synced, ...goalToSync } = goal;
                  return dbHelpers.createGoalAgainst(goalToSync);
                })
              );
              // Mark goals as synced
              const syncedGoals = goalsAgainst.map((goal: any) => ({ ...goal, synced: true }));
              set({ goalsAgainst: syncedGoals });
            }
          }

          // Sync events
          if (pendingChanges.events && events.length > 0) {
            const unsyncedEvents = events.filter((event: any) => !event.synced);
            if (unsyncedEvents.length > 0) {
              await Promise.all(
                unsyncedEvents.map((event: any) => {
                  const { synced, ...eventToSync } = event;
                  return dbHelpers.createGameEvent(eventToSync);
                })
              );
              // Mark events as synced
              const syncedEvents = events.map((event: any) => ({ ...event, synced: true }));
              set({ events: syncedEvents });
            }
          }

          // Sync game state
          if (pendingChanges.gameState) {
            const gameUpdates: any = {
              currentPeriod: currentGame.currentPeriod,
              homeScore: currentGame.homeScore,
              awayScore: currentGame.awayScore,
              status: currentGame.status
            };

            // Only include teamSide if it's defined
            if (currentGame.teamSide !== undefined) {
              gameUpdates.teamSide = currentGame.teamSide;
            }

            await dbHelpers.updateGame(currentGame.id, gameUpdates);
          }

          // Clear pending changes
          set({
            pendingChanges: {
              shots: false,
              goalsAgainst: false,
              events: false,
              gameState: false
            },
            lastSyncTime: Date.now(),
            isSyncing: false
          });

          console.log('✅ Sync completed successfully');
        } catch (error) {
          console.error('❌ Sync failed:', error);
          set({ isSyncing: false });
          throw error;
        }
      },

      addShot: async (shotData) => {
        const { currentGame, shots, pendingChanges } = get();
        if (!currentGame) return;

        const shot: Shot = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          timestamp: Date.now(),
          synced: false, // Mark as unsynced
          ...shotData
        };

        // Store locally only - Firebase sync happens later
        set({
          shots: [...shots, shot],
          pendingChanges: { ...pendingChanges, shots: true },
          lastAction: {
            type: 'shot',
            timestamp: Date.now(),
            wasGoal: shotData.result === 'goal'
          }
        });
      },

      addGoalAgainst: async (goalData) => {
        const { currentGame, goalsAgainst, pendingChanges } = get();
        if (!currentGame) return;

        const goal: GoalAgainst = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          timestamp: Date.now(),
          synced: false, // Mark as unsynced
          ...goalData
        };

        // Store locally only - Firebase sync happens later
        set({
          goalsAgainst: [...goalsAgainst, goal],
          pendingChanges: { ...pendingChanges, goalsAgainst: true },
          lastAction: {
            type: 'goal_against',
            timestamp: Date.now()
          }
        });
      },

      updateGameScore: async (homeScore, awayScore) => {
        const { currentGame, pendingChanges } = get();
        if (!currentGame) return;

        const updatedGame = { ...currentGame, homeScore, awayScore };

        // Store locally only - Firebase sync happens later
        set({
          currentGame: updatedGame,
          pendingChanges: { ...pendingChanges, gameState: true }
        });
      },

      updateGamePeriod: async (period, teamSide) => {
        const { currentGame, pendingChanges } = get();
        if (!currentGame) return;

        const updatedGame = { ...currentGame, currentPeriod: period, teamSide };

        // Store locally only - Firebase sync happens later
        set({
          currentGame: updatedGame,
          pendingChanges: { ...pendingChanges, gameState: true }
        });
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
        const updatedGame = { ...game, status: 'live' as const, currentPeriod: 1, homeScore: 0, awayScore: 0 };

        // Load game data but don't start timer automatically
        await get().loadGameData(game.id);
        set({
          currentGame: updatedGame,
          gameTime: 0,
          isTracking: false,
          isPaused: true,
          // Mark game state as needing sync
          pendingChanges: {
            shots: false,
            goalsAgainst: false,
            events: false,
            gameState: true // Game status changed to 'live'
          }
        });

        // Add game start event but don't auto-start timer (now local-first)
        await get().addGameEvent('game_start', 'Game started');
      },

      updateGameStatus: async (gameId, status) => {
        const { currentGame, pendingChanges } = get();
        if (currentGame && currentGame.id === gameId) {
          // Local-first: store status change locally, sync later
          set({
            currentGame: { ...currentGame, status },
            pendingChanges: { ...pendingChanges, gameState: true }
          });
        } else {
          // If not current game, sync immediately
          await dbHelpers.updateGame(gameId, { status });
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

        // Final sync to Firebase before archiving
        console.log('🔄 Game ended - Final sync to Firebase...');
        try {
          await get().syncToFirebase();
          console.log('✅ Final game sync completed');
        } catch (error) {
          console.error('❌ Final game sync failed:', error);
        }

        // Update game status to archived (direct Firebase call)
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

        // Sync to Firebase after period 1 ends
        if (currentGame.currentPeriod === 1) {
          console.log('🔄 Period 1 ended - Syncing to Firebase...');
          try {
            await get().syncToFirebase();
            console.log('✅ Period 1 sync completed');
          } catch (error) {
            console.error('❌ Period 1 sync failed:', error);
          }
        }
      },

      // Event management
      addGameEvent: async (type, description, data = null) => {
        const { currentGame, gameTime, events, pendingChanges } = get();
        if (!currentGame) return;

        const event: GameEvent = {
          id: crypto.randomUUID(),
          gameId: currentGame.id,
          type,
          period: currentGame.currentPeriod || 1,
          gameTime,
          timestamp: Date.now(),
          description,
          data,
          synced: false // Mark as unsynced
        };

        // Store locally only - Firebase sync happens later
        set({
          events: [...events, event],
          pendingChanges: { ...pendingChanges, events: true }
        });
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
        set({
          lastAction: {
            type: 'faceoff_win',
            timestamp: Date.now()
          }
        });
      },

      addFaceoffLoss: async () => {
        await get().addGameEvent('faceoff_lost', 'Faceoff lost');
        set({
          lastAction: {
            type: 'faceoff_loss',
            timestamp: Date.now()
          }
        });
      },

      // Enhanced undo functionality
      canUndo: () => {
        const { lastAction } = get();
        if (!lastAction) return false;

        // Allow undo within 30 seconds
        const timeDiff = Date.now() - lastAction.timestamp;
        return timeDiff <= 30000; // 30 seconds
      },

      undoLastAction: async () => {
        const {
          currentGame,
          shots,
          goalsAgainst,
          events,
          lastAction,
          pendingChanges
        } = get();

        if (!currentGame || !lastAction) return false;

        // Check time window
        const timeDiff = Date.now() - lastAction.timestamp;
        if (timeDiff > 30000) return false; // 30 seconds limit

        try {
          let updateState: any = { lastAction: null };

          switch (lastAction.type) {
            case 'shot':
              if (shots.length === 0) return false;

              const lastShot = shots[shots.length - 1];
              updateState.shots = shots.slice(0, -1);
              updateState.pendingChanges = { ...pendingChanges, shots: true };

              // If shot was a goal, revert score
              if (lastAction.wasGoal && lastShot.result === 'goal') {
                const newHomeScore = Math.max(0, (currentGame.homeScore || 0) - 1);
                updateState.currentGame = { ...currentGame, homeScore: newHomeScore };
                updateState.pendingChanges.gameState = true;

                // Remove the goal event from events
                let goalEventIndex = -1;
                for (let i = events.length - 1; i >= 0; i--) {
                  if (events[i].type === 'goal_home' &&
                      Math.abs(events[i].timestamp - lastShot.timestamp) < 1000) {
                    goalEventIndex = i;
                    break;
                  }
                }
                if (goalEventIndex >= 0) {
                  updateState.events = [
                    ...events.slice(0, goalEventIndex),
                    ...events.slice(goalEventIndex + 1)
                  ];
                  updateState.pendingChanges.events = true;
                }
              }
              break;

            case 'goal_against':
              if (goalsAgainst.length === 0) return false;

              const lastGoalAgainst = goalsAgainst[goalsAgainst.length - 1];
              updateState.goalsAgainst = goalsAgainst.slice(0, -1);
              updateState.pendingChanges = { ...pendingChanges, goalsAgainst: true };

              // Revert away team score
              const newAwayScore = Math.max(0, (currentGame.awayScore || 0) - 1);
              updateState.currentGame = { ...currentGame, awayScore: newAwayScore };
              updateState.pendingChanges.gameState = true;

              // Remove the goal against event from events
              let goalAgainstEventIndex = -1;
              for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].type === 'goal_away' &&
                    Math.abs(events[i].timestamp - lastGoalAgainst.timestamp) < 1000) {
                  goalAgainstEventIndex = i;
                  break;
                }
              }
              if (goalAgainstEventIndex >= 0) {
                updateState.events = [
                  ...events.slice(0, goalAgainstEventIndex),
                  ...events.slice(goalAgainstEventIndex + 1)
                ];
                updateState.pendingChanges.events = true;
              }
              break;

            case 'faceoff_win':
              // Remove last faceoff_won event
              let faceoffWinIndex = -1;
              for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].type === 'faceoff_won' &&
                    Math.abs(events[i].timestamp - lastAction.timestamp) < 1000) {
                  faceoffWinIndex = i;
                  break;
                }
              }
              if (faceoffWinIndex >= 0) {
                updateState.events = [
                  ...events.slice(0, faceoffWinIndex),
                  ...events.slice(faceoffWinIndex + 1)
                ];
                updateState.pendingChanges = { ...pendingChanges, events: true };
              }
              break;

            case 'faceoff_loss':
              // Remove last faceoff_lost event
              let faceoffLossIndex = -1;
              for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].type === 'faceoff_lost' &&
                    Math.abs(events[i].timestamp - lastAction.timestamp) < 1000) {
                  faceoffLossIndex = i;
                  break;
                }
              }
              if (faceoffLossIndex >= 0) {
                updateState.events = [
                  ...events.slice(0, faceoffLossIndex),
                  ...events.slice(faceoffLossIndex + 1)
                ];
                updateState.pendingChanges = { ...pendingChanges, events: true };
              }
              break;

            default:
              return false;
          }

          set(updateState);
          return true;

        } catch (error) {
          console.error('Undo failed:', error);
          return false;
        }
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