import { dbHelpers } from '../db';
import type { Team, Player, Season, Game, Shot, Drill } from '../types';

/**
 * Test Data Generator for Phase 2 Sync Testing
 * Generates realistic hockey coaching data for comprehensive testing
 */

export class TestDataGenerator {
  private static instance: TestDataGenerator;
  
  static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  // ==========================================
  // QUICK TEST DATA - FOR IMMEDIATE TESTING
  // ==========================================

  /**
   * Create minimal test data for basic sync testing
   */
  async createQuickTestData(): Promise<{
    team: Team,
    season: Season,
    game: Game,
    shots: Shot[]
  }> {
    console.log('🏒 Creating quick test data...');

    // Create team
    const team: Team = {
      id: crypto.randomUUID(),
      name: 'Test Thunder',
      shortName: 'THU',
      color: '#1E40AF',
      players: []
    };
    
    await dbHelpers.createTeam(team);
    console.log('✅ Team created:', team.name);

    // Create season
    const season: Season = {
      id: crypto.randomUUID(),
      name: '2024-25 Test Season',
      startDate: '2024-09-01',
      endDate: '2025-03-31',
      type: 'regular',
      status: 'active'
    };
    
    await dbHelpers.createSeason(season);
    console.log('✅ Season created:', season.name);

    // Create game
    const game: Game = {
      id: crypto.randomUUID(),
      homeTeamId: team.id,
      awayTeamName: 'Test Rivals',
      date: new Date().toISOString(),
      status: 'planned',
      seasonId: season.id,
      periods: 2,
      periodMinutes: 25,
      hasOvertime: true
    };
    
    await dbHelpers.createGame(game);
    console.log('✅ Game created vs', game.awayTeamName);

    // Create test shots
    const shots: Shot[] = [];
    const shotResults: Array<'goal' | 'save' | 'miss' | 'blocked'> = ['goal', 'save', 'miss', 'blocked'];
    
    for (let i = 0; i < 10; i++) {
      const shot: Shot = {
        id: crypto.randomUUID(),
        gameId: game.id,
        period: Math.floor(i / 5) + 1,
        timestamp: Date.now() + (i * 1000),
        x: Math.random() * 200 + 300, // Attacking zone
        y: Math.random() * 85 + 50,   // Within rink bounds
        result: shotResults[Math.floor(Math.random() * shotResults.length)],
        teamSide: 'home'
      };
      
      await dbHelpers.createShot(shot);
      shots.push(shot);
    }
    
    console.log('✅ Created 10 test shots');
    console.log('🎯 Quick test data ready! Check sync indicator.');

    return { team, season, game, shots };
  }

  // ==========================================
  // REALISTIC HOCKEY DATA - FOR THOROUGH TESTING
  // ==========================================

  /**
   * Generate a full season of realistic data
   */
  async createRealisticSeasonData(): Promise<void> {
    console.log('🏒 Generating realistic season data...');
    
    const team = await this.createRealisticTeam();
    const players = await this.createRealisticPlayers(team.id);
    const season = await this.createRealisticSeason();
    const games = await this.createRealisticGames(season.id, team.id, 20);
    
    console.log('✅ Realistic season data generated:');
    console.log(`   📊 ${players.length} players`);
    console.log(`   🏒 ${games.length} games`);
    console.log(`   🎯 ~${games.length * 35} shots (estimated)`);
  }

  /**
   * Create performance test data - lots of records
   */
  async createPerformanceTestData(shotCount: number = 1000): Promise<void> {
    console.log(`⚡ Generating ${shotCount} shots for performance testing...`);
    
    const { game } = await this.createQuickTestData();
    const batchSize = 100;
    const batches = Math.ceil(shotCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchShots = Math.min(batchSize, shotCount - (batch * batchSize));
      await this.createShotBatch(game.id, batchShots, batch * batchSize);
      
      console.log(`📦 Batch ${batch + 1}/${batches} complete (${batchShots} shots)`);
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`⚡ Performance test data ready: ${shotCount} shots`);
  }

  // ==========================================
  // CONFLICT TEST DATA - FOR CONFLICT TESTING
  // ==========================================

  /**
   * Create data designed to generate sync conflicts
   */
  async createConflictTestData(): Promise<void> {
    console.log('💥 Creating conflict test scenario...');
    
    // This would simulate multi-device conflicts
    // For now, creates data that can be manually conflicted
    const { team } = await this.createQuickTestData();
    
    console.log('💥 Conflict test data ready');
    console.log('🔧 Manually modify data in browser and server to test conflicts');
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async createRealisticTeam(): Promise<Team> {
    const teamNames = ['Thunder', 'Lightning', 'Storm', 'Flames', 'Ice Hawks'];
    const colors = ['#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED'];
    
    const name = `Test ${teamNames[Math.floor(Math.random() * teamNames.length)]}`;
    const team: Team = {
      id: crypto.randomUUID(),
      name,
      shortName: name.substring(5, 8).toUpperCase(),
      color: colors[Math.floor(Math.random() * colors.length)],
      players: []
    };
    
    await dbHelpers.createTeam(team);
    return team;
  }

  private async createRealisticPlayers(teamId: string): Promise<Player[]> {
    const firstNames = ['Connor', 'Nathan', 'Ethan', 'Liam', 'Mason', 'Jack', 'Ryan', 'Tyler'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Wilson', 'Miller', 'Davis', 'Garcia', 'Rodriguez'];
    const positions: Array<'F' | 'D' | 'G'> = ['F', 'F', 'F', 'D', 'D', 'G'];
    
    const players: Player[] = [];
    
    for (let i = 0; i < 15; i++) {
      const player: Player = {
        id: crypto.randomUUID(),
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        jerseyNumber: i + 1,
        position: positions[Math.floor(Math.random() * positions.length)],
        teamId
      };
      
      await dbHelpers.createPlayer(player);
      players.push(player);
    }
    
    return players;
  }

  private async createRealisticSeason(): Promise<Season> {
    const season: Season = {
      id: crypto.randomUUID(),
      name: '2024-25 Performance Test Season',
      startDate: '2024-09-01',
      endDate: '2025-03-31',
      type: 'regular',
      status: 'active'
    };
    
    await dbHelpers.createSeason(season);
    return season;
  }

  private async createRealisticGames(seasonId: string, teamId: string, gameCount: number): Promise<Game[]> {
    const opponents = ['Rivals', 'Eagles', 'Panthers', 'Wolves', 'Bears', 'Lions'];
    const games: Game[] = [];
    
    for (let i = 0; i < gameCount; i++) {
      const game: Game = {
        id: crypto.randomUUID(),
        seasonId,
        homeTeamId: teamId,
        awayTeamName: `Test ${opponents[Math.floor(Math.random() * opponents.length)]}`,
        date: new Date(Date.now() + (i * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        status: Math.random() > 0.7 ? 'archived' : 'planned',
        periods: 2,
        periodMinutes: 25,
        hasOvertime: true
      };
      
      await dbHelpers.createGame(game);
      
      // Add shots for archived games
      if (game.status === 'archived') {
        await this.createShotBatch(game.id, Math.floor(Math.random() * 20) + 25, 0);
      }
      
      games.push(game);
    }
    
    return games;
  }

  private async createShotBatch(gameId: string, shotCount: number, offset: number): Promise<void> {
    const shotResults: Array<'goal' | 'save' | 'miss' | 'blocked'> = ['goal', 'save', 'miss', 'blocked'];
    const resultWeights = [0.15, 0.6, 0.15, 0.1]; // Realistic shot result distribution
    
    for (let i = 0; i < shotCount; i++) {
      // Weighted random selection
      const rand = Math.random();
      let result = shotResults[0];
      let cumulativeWeight = 0;
      
      for (let j = 0; j < resultWeights.length; j++) {
        cumulativeWeight += resultWeights[j];
        if (rand <= cumulativeWeight) {
          result = shotResults[j];
          break;
        }
      }
      
      const shot: Shot = {
        id: crypto.randomUUID(),
        gameId,
        period: Math.floor((i + offset) / (shotCount / 2)) + 1,
        timestamp: Date.now() + ((i + offset) * 1000),
        x: Math.random() * 200 + 300, // Attacking zone
        y: Math.random() * 85 + 50,   // Within rink bounds  
        result,
        teamSide: 'home'
      };
      
      await dbHelpers.createShot(shot);
    }
  }

  // ==========================================
  // CLEANUP METHODS
  // ==========================================

  /**
   * Clear all test data
   */
  async clearAllTestData(): Promise<void> {
    console.log('🧹 Clearing all test data...');
    
    // Note: This would need to be implemented based on your cleanup strategy
    console.log('⚠️ Manual cleanup required - delete test records from database');
  }
}

// Export singleton
export const testDataGenerator = TestDataGenerator.getInstance();

// Global access for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testData = testDataGenerator;
}