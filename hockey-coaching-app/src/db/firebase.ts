import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
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
    const batch = writeBatch(db);
    
    // Delete the team
    const teamRef = doc(db, COLLECTIONS.teams, id);
    batch.delete(teamRef);
    
    // Delete all players from this team
    const playersQuery = query(
      collection(db, COLLECTIONS.players),
      where('teamId', '==', id)
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
    const q = query(
      collection(db, COLLECTIONS.players),
      where('teamId', '==', teamId),
      orderBy('jerseyNumber')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Player[];
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
    const q = query(
      collection(db, COLLECTIONS.seasons),
      orderBy('startDate', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Season[];
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
    const batch = writeBatch(db);
    
    // Delete the season
    const seasonRef = doc(db, COLLECTIONS.seasons, id);
    batch.delete(seasonRef);
    
    // Delete all games from this season
    const gamesQuery = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', id)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    gamesSnapshot.docs.forEach(gameDoc => {
      batch.delete(gameDoc.ref);
    });
    
    await batch.commit();
  },

  async getActiveSeason(type?: 'regular' | 'tournament' | 'playoffs'): Promise<Season | undefined> {
    let q;
    if (type) {
      q = query(
        collection(db, COLLECTIONS.seasons),
        where('status', '==', 'active'),
        where('type', '==', type),
        orderBy('startDate', 'desc'),
        limit(1)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.seasons),
        where('status', '==', 'active'),
        orderBy('startDate', 'desc'),
        limit(1)
      );
    }
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...convertTimestamps(doc.data())
      } as Season;
    }
    return undefined;
  },

  async setActiveSeason(seasonId: string): Promise<void> {
    const batch = writeBatch(db);
    const season = await this.getSeasonById(seasonId);
    if (!season) return;

    // Set existing seasons of same type to completed
    const existingActiveQuery = query(
      collection(db, COLLECTIONS.seasons),
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
    const q = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', seasonId)
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
    const q = query(
      collection(db, COLLECTIONS.games),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Game[];
  },

  async getGamesBySeason(seasonId: string): Promise<Game[]> {
    const q = query(
      collection(db, COLLECTIONS.games),
      where('seasonId', '==', seasonId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Game[];
  },

  async getGameById(id: string): Promise<Game | undefined> {
    const docRef = doc(db, COLLECTIONS.games, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamps(docSnap.data())
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
    const batch = writeBatch(db);
    
    // Delete the game
    const gameRef = doc(db, COLLECTIONS.games, id);
    batch.delete(gameRef);
    
    // Delete related data
    const relatedCollections = [COLLECTIONS.shots, COLLECTIONS.goalsAgainst, COLLECTIONS.gameEvents, COLLECTIONS.tacticalDrawings];
    
    for (const collectionName of relatedCollections) {
      const q = query(collection(db, collectionName), where('gameId', '==', id));
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
    const q = query(
      collection(db, COLLECTIONS.shots),
      where('gameId', '==', gameId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Shot[];
  },

  async createShot(shot: Shot): Promise<string> {
    const { id, ...shotData } = shot;
    const docRef = doc(db, COLLECTIONS.shots, id);
    await setDoc(docRef, {
      ...shotData,
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
    const q = query(
      collection(db, COLLECTIONS.goalsAgainst),
      where('gameId', '==', gameId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GoalAgainst[];
  },

  async createGoalAgainst(goal: GoalAgainst): Promise<string> {
    const { id, ...goalData } = goal;
    const docRef = doc(db, COLLECTIONS.goalsAgainst, id);
    await setDoc(docRef, {
      ...goalData,
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
    const q = query(
      collection(db, COLLECTIONS.gameEvents),
      where('gameId', '==', gameId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GameEvent[];
  },

  async createGameEvent(event: GameEvent): Promise<string> {
    const { id, ...eventData } = event;
    const docRef = doc(db, COLLECTIONS.gameEvents, id);
    await setDoc(docRef, {
      ...eventData,
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
    const q = query(
      collection(db, COLLECTIONS.gameEvents),
      where('gameId', '==', gameId)
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
    const q = query(
      collection(db, COLLECTIONS.drills),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Drill[];
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
    const q = query(
      collection(db, COLLECTIONS.practicePlans),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as PracticePlan[];
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
    const q = query(
      collection(db, COLLECTIONS.tacticalDrawings),
      where('gameId', '==', gameId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as TacticalDrawing[];
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
    const q = query(
      collection(db, COLLECTIONS.tacticalDrawings),
      where('gameId', '==', gameId)
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
    const q = query(
      collection(db, COLLECTIONS.gamePresets),
      orderBy('name', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const presets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GamePreset[];
    
    // Sort with default presets first
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