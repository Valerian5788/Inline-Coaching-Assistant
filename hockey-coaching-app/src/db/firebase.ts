import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import type {
  Team,
  Player,
  Season,
  Game,
  Shot,
  GoalAgainst,
  GameEvent,
  Drill,
  PracticePlan,
  TacticalDrawing,
  GamePreset
} from '../types';

// Collection names
const COLLECTIONS = {
  teams: 'teams',
  players: 'players',
  seasons: 'seasons',
  games: 'games',
  shots: 'shots',
  goalsAgainst: 'goalsAgainst',
  gameEvents: 'gameEvents',
  drills: 'drills',
  practicePlans: 'practicePlans',
  tacticalDrawings: 'tacticalDrawings',
  gamePresets: 'gamePresets'
} as const;

// Helper function to convert Firestore timestamps
const convertTimestamps = (data: any) => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  });
  
  return converted;
};

// Firebase Database Helpers
export const firebaseDbHelpers = {
  // ==========================================
  // TEAMS
  // ==========================================
  async getAllTeams(): Promise<Team[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];
    
    const q = query(
      collection(db, COLLECTIONS.teams),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Team[];
  },

  async getTeamById(id: string): Promise<Team | undefined> {
    const docRef = doc(db, COLLECTIONS.teams, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as Team;
    }
    return undefined;
  },

  async createTeam(team: Team): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be authenticated');
    
    const { id, ...teamData } = team;
    const docRef = doc(db, COLLECTIONS.teams, id);
    await setDoc(docRef, {
      ...teamData,
      userId, // Add current user's ID
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updateTeam(id: string, changes: Partial<Team>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.teams, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1; // Return 1 to match Dexie interface
  },

  async deleteTeam(id: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const batch = writeBatch(db);

    // Delete the team
    const teamRef = doc(db, COLLECTIONS.teams, id);
    batch.delete(teamRef);

    // Delete all players from this team with userId filter
    const playersQuery = query(
      collection(db, COLLECTIONS.players),
      where('teamId', '==', id),
      where('userId', '==', userId)
    );
    const playersSnapshot = await getDocs(playersQuery);
    playersSnapshot.docs.forEach(playerDoc => {
      batch.delete(playerDoc.ref);
    });

    await batch.commit();
  },

  // ==========================================
  // PLAYERS
  // ==========================================
  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.players),
      where('teamId', '==', teamId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const players = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Player[];

    // Sort client-side instead of server-side
    return players.sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  },

  async createPlayer(player: Player): Promise<string> {
    const { id, ...playerData } = player;
    const docRef = doc(db, COLLECTIONS.players, id);
    await setDoc(docRef, {
      ...playerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updatePlayer(id: string, changes: Partial<Player>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.players, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deletePlayer(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.players, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // SEASONS
  // ==========================================
  async getAllSeasons(): Promise<Season[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.seasons),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const seasons = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Season[];

    // Sort client-side instead of server-side
    return seasons.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  async getSeasonById(id: string): Promise<Season | undefined> {
    const docRef = doc(db, COLLECTIONS.seasons, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as Season;
    }
    return undefined;
  },

  async createSeason(season: Season): Promise<string> {
    const { id, ...seasonData } = season;
    const docRef = doc(db, COLLECTIONS.seasons, id);
    await setDoc(docRef, {
      ...seasonData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updateSeason(id: string, changes: Partial<Season>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.seasons, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteSeason(id: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const batch = writeBatch(db);

    // Delete the season
    const seasonRef = doc(db, COLLECTIONS.seasons, id);
    batch.delete(seasonRef);

    // Delete all games from this season with userId filter
    const gamesQuery = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', id),
      where('userId', '==', userId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    gamesSnapshot.docs.forEach(gameDoc => {
      batch.delete(gameDoc.ref);
    });

    await batch.commit();
  },

  async getActiveSeason(type?: 'regular' | 'tournament' | 'playoffs'): Promise<Season | undefined> {
    const userId = auth.currentUser?.uid;
    if (!userId) return undefined;

    let q;
    if (type) {
      q = query(
        collection(db, COLLECTIONS.seasons),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        where('type', '==', type)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.seasons),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
    }
    
    const querySnapshot = await getDocs(q);

    // Get all matching seasons and sort client-side
    const seasons = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Season[];

    if (seasons.length > 0) {
      // Sort by startDate descending and return the first one
      const sortedSeasons = seasons.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return sortedSeasons[0];
    }
    return undefined;
  },

  async setActiveSeason(seasonId: string): Promise<void> {
    const batch = writeBatch(db);
    const season = await this.getSeasonById(seasonId);
    if (!season) return;

    // Set existing seasons of same type to completed
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const existingActiveQuery = query(
      collection(db, COLLECTIONS.seasons),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      where('type', '==', season.type)
    );
    const existingActiveSnapshot = await getDocs(existingActiveQuery);
    existingActiveSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'completed', updatedAt: serverTimestamp() });
    });

    // Set the new season as active
    const seasonRef = doc(db, COLLECTIONS.seasons, seasonId);
    batch.update(seasonRef, { status: 'active', updatedAt: serverTimestamp() });
    
    await batch.commit();
  },

  async getSeasonGameCount(seasonId: string): Promise<number> {
    const userId = auth.currentUser?.uid;
    if (!userId) return 0;

    const q = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', seasonId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async getSeasonsWithGameCounts(): Promise<Array<Season & { gameCount: number }>> {
    const seasons = await this.getAllSeasons();
    const seasonsWithCounts = await Promise.all(
      seasons.map(async (season) => ({
        ...season,
        gameCount: await this.getSeasonGameCount(season.id)
      }))
    );
    return seasonsWithCounts;
  },

  // ==========================================
  // GAMES
  // ==========================================
  async getAllGames(): Promise<Game[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.games),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const games = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Game[];

    // Sort client-side instead of server-side
    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getGamesBySeason(seasonId: string): Promise<Game[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', seasonId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const games = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Game[];

    // Sort client-side instead of server-side
    return games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getGameById(id: string): Promise<Game | undefined> {
    const userId = auth.currentUser?.uid;
    if (!userId) return undefined;

    const docRef = doc(db, COLLECTIONS.games, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const gameData = docSnap.data();
      // Check if the game belongs to the current user
      if (gameData.userId !== userId) {
        return undefined;
      }
      return {
        id: docSnap.id,
        ...convertTimestamps(gameData)
      } as Game;
    }
    return undefined;
  },

  async createGame(game: Game): Promise<string> {
    const { id, ...gameData } = game;
    const docRef = doc(db, COLLECTIONS.games, id);
    await setDoc(docRef, {
      ...gameData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updateGame(id: string, changes: Partial<Game>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.games, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteGame(id: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const batch = writeBatch(db);

    // Delete the game
    const gameRef = doc(db, COLLECTIONS.games, id);
    batch.delete(gameRef);

    // Delete related data with userId filter
    const relatedCollections = [COLLECTIONS.shots, COLLECTIONS.goalsAgainst, COLLECTIONS.gameEvents, COLLECTIONS.tacticalDrawings];

    for (const collectionName of relatedCollections) {
      const q = query(
        collection(db, collectionName),
        where('gameId', '==', id),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    await batch.commit();
  },

  // ==========================================
  // SHOTS
  // ==========================================
  async getShotsByGame(gameId: string): Promise<Shot[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.shots),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const shots = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Shot[];

    // Sort client-side to avoid composite index
    return shots.sort((a, b) => a.timestamp - b.timestamp);
  },

  async createShot(shot: Shot): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be authenticated');

    const { id, ...shotData } = shot;
    const docRef = doc(db, COLLECTIONS.shots, id);
    await setDoc(docRef, {
      ...shotData,
      userId,
      createdAt: serverTimestamp()
    });
    return id;
  },

  async updateShot(id: string, changes: Partial<Shot>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.shots, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteShot(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.shots, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // GOALS AGAINST
  // ==========================================
  async getGoalsAgainstByGame(gameId: string): Promise<GoalAgainst[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.goalsAgainst),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const goals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GoalAgainst[];

    // Sort client-side to avoid composite index
    return goals.sort((a, b) => a.timestamp - b.timestamp);
  },

  async createGoalAgainst(goal: GoalAgainst): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be authenticated');

    const { id, ...goalData } = goal;
    const docRef = doc(db, COLLECTIONS.goalsAgainst, id);
    await setDoc(docRef, {
      ...goalData,
      userId,
      createdAt: serverTimestamp()
    });
    return id;
  },

  async updateGoalAgainst(id: string, changes: Partial<GoalAgainst>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.goalsAgainst, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteGoalAgainst(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.goalsAgainst, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // GAME EVENTS
  // ==========================================
  async getEventsByGame(gameId: string): Promise<GameEvent[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.gameEvents),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GameEvent[];

    // Sort client-side to avoid composite index
    return events.sort((a, b) => a.timestamp - b.timestamp);
  },

  async createGameEvent(event: GameEvent): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User must be authenticated');

    const { id, ...eventData } = event;
    const docRef = doc(db, COLLECTIONS.gameEvents, id);
    await setDoc(docRef, {
      ...eventData,
      userId,
      createdAt: serverTimestamp()
    });
    return id;
  },

  async updateGameEvent(id: string, changes: Partial<GameEvent>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.gameEvents, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteGameEvent(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.gameEvents, id);
    await deleteDoc(docRef);
  },

  async deleteGameEventsByGame(gameId: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, COLLECTIONS.gameEvents),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  },

  // ==========================================
  // DRILLS
  // ==========================================
  async getAllDrills(): Promise<Drill[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.drills),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const drills = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Drill[];

    // Sort client-side
    return drills.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  },

  async getDrillById(id: string): Promise<Drill | undefined> {
    const docRef = doc(db, COLLECTIONS.drills, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as Drill;
    }
    return undefined;
  },

  async getDrillsByCategory(category: string): Promise<Drill[]> {
    if (category === 'All') return this.getAllDrills();
    
    const q = query(
      collection(db, COLLECTIONS.drills),
      where('category', '==', category),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Drill[];
  },

  async getDrillsByTags(tags: string[]): Promise<Drill[]> {
    // Firestore doesn't support array-contains-any for multiple values efficiently
    // We'll get all drills and filter client-side for now
    const allDrills = await this.getAllDrills();
    return allDrills.filter(drill => 
      drill.tags && tags.some(tag => drill.tags.includes(tag))
    );
  },

  async createDrill(drill: Drill): Promise<string> {
    const { id, ...drillData } = drill;
    const docRef = doc(db, COLLECTIONS.drills, id);
    await setDoc(docRef, {
      ...drillData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updateDrill(id: string, changes: Partial<Drill>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.drills, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteDrill(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.drills, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // PRACTICE PLANS
  // ==========================================
  async getAllPracticePlans(): Promise<PracticePlan[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.practicePlans),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const plans = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as PracticePlan[];

    // Sort client-side
    return plans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getPracticePlanById(id: string): Promise<PracticePlan | undefined> {
    const docRef = doc(db, COLLECTIONS.practicePlans, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as PracticePlan;
    }
    return undefined;
  },

  async createPracticePlan(plan: PracticePlan): Promise<string> {
    const { id, ...planData } = plan;
    const docRef = doc(db, COLLECTIONS.practicePlans, id);
    await setDoc(docRef, {
      ...planData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updatePracticePlan(id: string, changes: Partial<PracticePlan>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.practicePlans, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deletePracticePlan(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.practicePlans, id);
    await deleteDoc(docRef);
  },

  // ==========================================
  // TACTICAL DRAWINGS
  // ==========================================
  async getTacticalDrawingsByGame(gameId: string): Promise<TacticalDrawing[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.tacticalDrawings),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const drawings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as TacticalDrawing[];

    // Sort client-side to avoid composite index
    return drawings.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getTacticalDrawingById(id: string): Promise<TacticalDrawing | undefined> {
    const docRef = doc(db, COLLECTIONS.tacticalDrawings, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as TacticalDrawing;
    }
    return undefined;
  },

  async createTacticalDrawing(drawing: TacticalDrawing): Promise<string> {
    const { id, ...drawingData } = drawing;
    const docRef = doc(db, COLLECTIONS.tacticalDrawings, id);
    await setDoc(docRef, {
      ...drawingData,
      createdAt: serverTimestamp()
    });
    return id;
  },

  async updateTacticalDrawing(id: string, changes: Partial<TacticalDrawing>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.tacticalDrawings, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteTacticalDrawing(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.tacticalDrawings, id);
    await deleteDoc(docRef);
  },

  async deleteTacticalDrawingsByGame(gameId: string): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, COLLECTIONS.tacticalDrawings),
      where('gameId', '==', gameId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  },

  // ==========================================
  // GAME PRESETS
  // ==========================================
  async getAllGamePresets(): Promise<GamePreset[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.gamePresets),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const presets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GamePreset[];

    // Sort client-side with default presets first
    return presets.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  },

  async getGamePresetById(id: string): Promise<GamePreset | undefined> {
    const docRef = doc(db, COLLECTIONS.gamePresets, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
      } as GamePreset;
    }
    return undefined;
  },

  async createGamePreset(preset: GamePreset): Promise<string> {
    const { id, ...presetData } = preset;
    const docRef = doc(db, COLLECTIONS.gamePresets, id);
    await setDoc(docRef, {
      ...presetData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  },

  async updateGamePreset(id: string, changes: Partial<GamePreset>): Promise<number> {
    const docRef = doc(db, COLLECTIONS.gamePresets, id);
    await updateDoc(docRef, {
      ...changes,
      updatedAt: serverTimestamp()
    });
    return 1;
  },

  async deleteGamePreset(id: string): Promise<void> {
    const preset = await this.getGamePresetById(id);
    if (preset?.isDefault) {
      throw new Error('Cannot delete default presets');
    }
    const docRef = doc(db, COLLECTIONS.gamePresets, id);
    await deleteDoc(docRef);
  }
};

// Real-time subscriptions helper
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  queryConstraints: any[] = []
) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  const q = query(
    collection(db, collectionName), 
    where('userId', '==', userId),
    ...queryConstraints
  );
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as T[];
    callback(data);
  });
};