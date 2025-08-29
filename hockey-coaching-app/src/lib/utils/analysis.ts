import type { RinkZone, Shot, ShotWithGame, Game, ZoneStats, GameStats, AnalysisFilters, GoalAgainst } from '../../types';
import { dbHelpers } from '../../db';
import { 
  normalizeShotsArray, 
  normalizeGoalAgainst, 
  getNormalizedRinkZone,
  type NormalizedShotWithGame 
} from '../../utils/shotNormalization';

// Define rink zones based on normalized coordinates (0-1)
// Assumes attacking zone is on the right side (x > 0.5)
export const getRinkZone = (x: number, y: number): RinkZone => {
  // Normalize coordinates to attacking zone (right side of rink)
  const attackingX = x;
  const centerY = y;

  // Define zone boundaries
  // X zones: close (0.65-1.0), medium (0.5-0.65), far (0-0.5)
  // Y zones: left (0-0.35), center (0.35-0.65), right (0.65-1.0)
  
  if (attackingX >= 0.65) {
    // Close to goal zones
    if (centerY <= 0.35) {
      return 'left_circle';
    } else if (centerY >= 0.65) {
      return 'right_circle';
    } else {
      return attackingX >= 0.8 ? 'low_slot' : 'high_slot';
    }
  } else if (attackingX >= 0.5) {
    // Medium distance zones
    if (centerY <= 0.3) {
      return 'left_wing';
    } else if (centerY >= 0.7) {
      return 'right_wing';
    } else {
      return 'center_point';
    }
  } else {
    // Far zones (defensive zone shots)
    if (centerY <= 0.35) {
      return 'left_point';
    } else if (centerY >= 0.65) {
      return 'right_point';
    } else {
      return 'center_point';
    }
  }
};

export const getZoneDisplayName = (zone: RinkZone): string => {
  const zoneNames: Record<RinkZone, string> = {
    high_slot: 'High Slot',
    low_slot: 'Low Slot',
    left_circle: 'Left Circle',
    right_circle: 'Right Circle',
    left_point: 'Left Point',
    right_point: 'Right Point',
    left_wing: 'Left Wing',
    right_wing: 'Right Wing',
    center_point: 'Center Point'
  };
  return zoneNames[zone];
};

export const getShotColor = (result: Shot['result']): string => {
  const colors = {
    goal: '#22c55e',     // green-500
    save: '#3b82f6',     // blue-500
    miss: '#6b7280',     // gray-500
    blocked: '#f97316'   // orange-500
  };
  return colors[result];
};

export const calculateZoneStats = (shots: Shot[]): ZoneStats[] => {
  const zoneData: Record<RinkZone, ZoneStats> = {
    high_slot: { zone: 'high_slot', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    low_slot: { zone: 'low_slot', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_circle: { zone: 'left_circle', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_circle: { zone: 'right_circle', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_point: { zone: 'left_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_point: { zone: 'right_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_wing: { zone: 'left_wing', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_wing: { zone: 'right_wing', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    center_point: { zone: 'center_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 }
  };

  shots.forEach(shot => {
    const zone = getRinkZone(shot.x, shot.y);
    zoneData[zone].shots++;
    
    switch (shot.result) {
      case 'goal':
        zoneData[zone].goals++;
        break;
      case 'save':
        zoneData[zone].saves++;
        break;
      case 'miss':
        zoneData[zone].misses++;
        break;
    }
  });

  // Calculate percentages
  Object.values(zoneData).forEach(zone => {
    zone.percentage = zone.shots > 0 ? (zone.goals / zone.shots) * 100 : 0;
  });

  return Object.values(zoneData).filter(zone => zone.shots > 0);
};

// New normalized version using normalized coordinates
export const calculateNormalizedZoneStats = (normalizedShots: NormalizedShotWithGame[]): ZoneStats[] => {
  const zoneData: Record<RinkZone, ZoneStats> = {
    high_slot: { zone: 'high_slot', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    low_slot: { zone: 'low_slot', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_circle: { zone: 'left_circle', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_circle: { zone: 'right_circle', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_point: { zone: 'left_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_point: { zone: 'right_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    left_wing: { zone: 'left_wing', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    right_wing: { zone: 'right_wing', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 },
    center_point: { zone: 'center_point', shots: 0, goals: 0, saves: 0, misses: 0, percentage: 0 }
  };

  normalizedShots.forEach(shot => {
    const zone = getNormalizedRinkZone(shot.normalizedX, shot.normalizedY);
    zoneData[zone].shots++;
    
    switch (shot.result) {
      case 'goal':
        zoneData[zone].goals++;
        break;
      case 'save':
        zoneData[zone].saves++;
        break;
      case 'miss':
        zoneData[zone].misses++;
        break;
    }
  });

  // Calculate percentages
  Object.values(zoneData).forEach(zone => {
    zone.percentage = zone.shots > 0 ? (zone.goals / zone.shots) * 100 : 0;
  });

  return Object.values(zoneData).filter(zone => zone.shots > 0);
};

export const calculateGameStats = (shots: Shot[], games: Game[]): GameStats => {
  const totalShots = shots.length;
  const totalGoals = shots.filter(s => s.result === 'goal').length;
  const totalSaves = shots.filter(s => s.result === 'save').length;
  const totalMisses = shots.filter(s => s.result === 'miss').length;
  const totalBlocked = shots.filter(s => s.result === 'blocked').length;
  
  const gamesCount = games.length || 1;
  const shotsPerGame = totalShots / gamesCount;
  const goalPercentage = totalShots > 0 ? (totalGoals / totalShots) * 100 : 0;
  const savePercentage = totalShots > 0 ? (totalSaves / totalShots) * 100 : 0;

  return {
    totalShots,
    totalGoals,
    totalSaves,
    totalMisses,
    totalBlocked,
    shotsPerGame: Math.round(shotsPerGame * 10) / 10,
    goalPercentage: Math.round(goalPercentage * 10) / 10,
    savePercentage: Math.round(savePercentage * 10) / 10
  };
};

export const getFilteredShots = async (filters: AnalysisFilters): Promise<ShotWithGame[]> => {
  // Get all games first to apply filters
  let games: Game[] = [];
  
  if (filters.seasonId) {
    games = await dbHelpers.getGamesBySeason(filters.seasonId);
  } else {
    games = await dbHelpers.getAllGames();
  }

  // Apply team filter
  if (filters.teamId) {
    games = games.filter(game => game.homeTeamId === filters.teamId);
  }

  // Apply date filters
  if (filters.dateFrom) {
    games = games.filter(game => new Date(game.date) >= new Date(filters.dateFrom!));
  }
  
  if (filters.dateTo) {
    games = games.filter(game => new Date(game.date) <= new Date(filters.dateTo!));
  }

  // Apply specific game IDs if provided
  if (filters.gameIds && filters.gameIds.length > 0) {
    games = games.filter(game => filters.gameIds!.includes(game.id));
  }

  // Get shots for filtered games
  const shotsWithGameData: ShotWithGame[] = [];
  
  for (const game of games) {
    const shots = await dbHelpers.getShotsByGame(game.id);
    const shotsWithGame = shots.map(shot => ({
      ...shot,
      gameDate: game.date,
      homeTeamId: game.homeTeamId,
      awayTeamName: game.awayTeamName,
      seasonId: game.seasonId
    }));
    shotsWithGameData.push(...shotsWithGame);
  }

  return shotsWithGameData;
};

// Enhanced version that returns normalized shots with games
export const getFilteredNormalizedShots = async (filters: AnalysisFilters): Promise<NormalizedShotWithGame[]> => {
  const games = await getFilteredGames(filters);
  const shots = await getFilteredShots(filters);
  
  // Normalize shots using the normalization utility
  return normalizeShotsArray(shots, games);
};

// Get goals against with normalization
export const getFilteredGoalsAgainst = async (filters: AnalysisFilters) => {
  const games = await getFilteredGames(filters);
  const goalsAgainst: GoalAgainst[] = [];
  
  for (const game of games) {
    const gameGoalsAgainst = await dbHelpers.getGoalsAgainstByGame(game.id);
    goalsAgainst.push(...gameGoalsAgainst);
  }
  
  // Normalize goals against
  return goalsAgainst.map(goal => normalizeGoalAgainst(goal, games.find(g => g.id === goal.gameId)!));
};

// Enhanced shot color with danger level
export const getEnhancedShotColor = (result: Shot['result'], dangerLevel?: 'high' | 'medium' | 'low'): string => {
  if (result === 'goal') {
    return '#22c55e'; // Green for goals
  }
  
  // Color other results by danger level if available
  if (dangerLevel) {
    switch (dangerLevel) {
      case 'high': return result === 'save' ? '#ef4444' : '#f97316'; // Red/Orange for high danger
      case 'medium': return result === 'save' ? '#f59e0b' : '#eab308'; // Yellow for medium danger
      case 'low': return result === 'save' ? '#6b7280' : '#9ca3af'; // Gray for low danger
    }
  }
  
  return getShotColor(result);
};

export const getFilteredGames = async (filters: AnalysisFilters): Promise<Game[]> => {
  let games: Game[] = [];
  
  if (filters.seasonId) {
    games = await dbHelpers.getGamesBySeason(filters.seasonId);
  } else {
    games = await dbHelpers.getAllGames();
  }

  // Apply filters
  if (filters.teamId) {
    games = games.filter(game => game.homeTeamId === filters.teamId);
  }

  if (filters.dateFrom) {
    games = games.filter(game => new Date(game.date) >= new Date(filters.dateFrom!));
  }
  
  if (filters.dateTo) {
    games = games.filter(game => new Date(game.date) <= new Date(filters.dateTo!));
  }

  if (filters.gameIds && filters.gameIds.length > 0) {
    games = games.filter(game => filters.gameIds!.includes(game.id));
  }

  return games;
};