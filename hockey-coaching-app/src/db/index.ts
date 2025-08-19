import Dexie, { type Table } from 'dexie';
import type { Team, Player, Season, Game, Shot, GoalAgainst } from '../types';

export class HockeyDB extends Dexie {
  teams!: Table<Team>;
  players!: Table<Player>;
  seasons!: Table<Season>;
  games!: Table<Game>;
  shots!: Table<Shot>;
  goalsAgainst!: Table<GoalAgainst>;

  constructor() {
    super('HockeyCoachingDB');
    
    this.version(1).stores({
      teams: 'id, name, shortName',
      players: 'id, teamId, jerseyNumber, position, firstName, lastName',
      seasons: 'id, name, status, type, startDate, endDate',
      games: 'id, seasonId, homeTeamId, date, status',
      shots: 'id, gameId, period, timestamp, result, teamSide',
      goalsAgainst: 'id, gameId, period, timestamp'
    });
  }
}

export const db = new HockeyDB();

// Database helper functions
export const dbHelpers = {
  // Teams
  async getAllTeams(): Promise<Team[]> {
    return await db.teams.toArray();
  },

  async getTeamById(id: string): Promise<Team | undefined> {
    return await db.teams.get(id);
  },

  async createTeam(team: Team): Promise<string> {
    return await db.teams.add(team);
  },

  async updateTeam(id: string, changes: Partial<Team>): Promise<number> {
    return await db.teams.update(id, changes);
  },

  async deleteTeam(id: string): Promise<void> {
    await db.teams.delete(id);
    // Also delete all players from this team
    await db.players.where('teamId').equals(id).delete();
  },

  // Players
  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return await db.players.where('teamId').equals(teamId).toArray();
  },

  async createPlayer(player: Player): Promise<string> {
    return await db.players.add(player);
  },

  async updatePlayer(id: string, changes: Partial<Player>): Promise<number> {
    return await db.players.update(id, changes);
  },

  async deletePlayer(id: string): Promise<void> {
    await db.players.delete(id);
  },

  // Seasons
  async getAllSeasons(): Promise<Season[]> {
    const seasons = await db.seasons.toArray();
    // Sort by start date, most recent first
    return seasons.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  },

  async getSeasonById(id: string): Promise<Season | undefined> {
    return await db.seasons.get(id);
  },

  async createSeason(season: Season): Promise<string> {
    return await db.seasons.add(season);
  },

  async updateSeason(id: string, changes: Partial<Season>): Promise<number> {
    return await db.seasons.update(id, changes);
  },

  async deleteSeason(id: string): Promise<void> {
    await db.seasons.delete(id);
    // Also delete all games from this season
    await db.games.where('seasonId').equals(id).delete();
  },

  // Active Season Management
  async getActiveSeason(type?: 'regular' | 'tournament' | 'playoffs'): Promise<Season | undefined> {
    const seasons = await db.seasons.where('status').equals('active').toArray();
    if (type) {
      return seasons.find(s => s.type === type);
    }
    // Return the most recently started active season if no type specified
    return seasons.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
  },

  async setActiveSeason(seasonId: string): Promise<void> {
    const season = await db.seasons.get(seasonId);
    if (!season) return;

    // Only allow one active season per type (regular, tournament, playoffs can coexist)
    const existingActive = await db.seasons.where('status').equals('active').and(s => s.type === season.type).toArray();
    
    // Set existing seasons of same type to completed
    for (const existingSeason of existingActive) {
      await db.seasons.update(existingSeason.id, { status: 'completed' });
    }

    // Set the new season as active
    await db.seasons.update(seasonId, { status: 'active' });
  },

  async getSeasonGameCount(seasonId: string): Promise<number> {
    return await db.games.where('seasonId').equals(seasonId).count();
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

  // Games
  async getGamesBySeason(seasonId: string): Promise<Game[]> {
    return await db.games.where('seasonId').equals(seasonId).toArray();
  },

  async getGameById(id: string): Promise<Game | undefined> {
    return await db.games.get(id);
  },

  async createGame(game: Game): Promise<string> {
    return await db.games.add(game);
  },

  async updateGame(id: string, changes: Partial<Game>): Promise<number> {
    return await db.games.update(id, changes);
  },

  async deleteGame(id: string): Promise<void> {
    await db.games.delete(id);
    // Also delete all shots and goals against from this game
    await db.shots.where('gameId').equals(id).delete();
    await db.goalsAgainst.where('gameId').equals(id).delete();
  },

  // Shots
  async getShotsByGame(gameId: string): Promise<Shot[]> {
    return await db.shots.where('gameId').equals(gameId).toArray();
  },

  async createShot(shot: Shot): Promise<string> {
    return await db.shots.add(shot);
  },

  async updateShot(id: string, changes: Partial<Shot>): Promise<number> {
    return await db.shots.update(id, changes);
  },

  async deleteShot(id: string): Promise<void> {
    await db.shots.delete(id);
  },

  // Goals Against
  async getGoalsAgainstByGame(gameId: string): Promise<GoalAgainst[]> {
    return await db.goalsAgainst.where('gameId').equals(gameId).toArray();
  },

  async createGoalAgainst(goal: GoalAgainst): Promise<string> {
    return await db.goalsAgainst.add(goal);
  },

  async updateGoalAgainst(id: string, changes: Partial<GoalAgainst>): Promise<number> {
    return await db.goalsAgainst.update(id, changes);
  },

  async deleteGoalAgainst(id: string): Promise<void> {
    await db.goalsAgainst.delete(id);
  }
};