import type {
  Shot,
  Game,
  AnalysisFilters,
  ShotWithGame,
  ShotResult
} from '../../types';
import {
  getNormalizedRinkZone,
  normalizeShotsArray,
  type NormalizedShotWithGame
} from '../../utils/shotNormalization';

// Enhanced shot filtering with all the new filter options
export const applyEnhancedFilters = (
  shots: NormalizedShotWithGame[],
  games: Game[],
  filters: AnalysisFilters
): NormalizedShotWithGame[] => {
  let filteredShots = [...shots];

  // Period filtering
  if (filters.periods && Array.isArray(filters.periods) && filters.periods.length > 0) {
    filteredShots = filteredShots.filter(shot =>
      filters.periods!.includes(shot.period)
    );
  }

  // Shot result filtering
  if (filters.shotResults && Array.isArray(filters.shotResults) && filters.shotResults.length > 0) {
    filteredShots = filteredShots.filter(shot =>
      filters.shotResults!.includes(shot.result)
    );
  }

  // Time range filtering within periods
  if (filters.timeFrom !== undefined || filters.timeTo !== undefined) {
    filteredShots = filteredShots.filter(shot => {
      const shotGameTime = shot.timestamp; // This should be game time in seconds
      const game = games.find(g => g.id === shot.gameId);
      if (!game) return true;

      // Convert shot timestamp to period time in minutes
      const periodLength = game.periodMinutes * 60; // Convert to seconds
      const periodStartTime = (shot.period - 1) * periodLength;
      const periodTime = (shotGameTime - periodStartTime) / 60; // Convert to minutes

      const from = filters.timeFrom ?? 0;
      const to = filters.timeTo ?? game.periodMinutes;

      return periodTime >= from && periodTime <= to;
    });
  }

  // Score situation filtering
  if (filters.scoreSituation && filters.scoreSituation !== 'all') {
    filteredShots = filteredShots.filter(shot => {
      const game = games.find(g => g.id === shot.gameId);
      if (!game) return true;

      // For now, we'll use the final score as a proxy
      // In a real implementation, you'd track score at time of shot
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;

      switch (filters.scoreSituation) {
        case 'winning':
          return homeScore > awayScore;
        case 'losing':
          return homeScore < awayScore;
        case 'tied':
          return homeScore === awayScore;
        default:
          return true;
      }
    });
  }

  return filteredShots;
};

// Multi-game comparison data preparation
export interface GameComparisonData {
  gameId: string;
  gameTitle: string;
  gameDate: string;
  shots: NormalizedShotWithGame[];
  color: string;
  opacity: number;
}

export const prepareMultiGameComparison = (
  selectedGameIds: string[],
  allShots: NormalizedShotWithGame[],
  games: Game[]
): GameComparisonData[] => {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#ec4899', // pink
    '#6b7280', // gray
  ];

  return selectedGameIds.map((gameId, index) => {
    const game = games.find(g => g.id === gameId);
    const gameShots = allShots.filter(shot => shot.gameId === gameId);

    return {
      gameId,
      gameTitle: game ? `vs ${game.awayTeamName}` : 'Unknown',
      gameDate: game ? new Date(game.date).toLocaleDateString() : '',
      shots: gameShots,
      color: colors[index % colors.length],
      opacity: Math.max(0.6, 1 - (index * 0.1)) // Fade older selections
    };
  });
};

// Aggregate multiple games into single dataset
export const aggregateMultipleGames = (
  gameComparisons: GameComparisonData[]
): NormalizedShotWithGame[] => {
  return gameComparisons.flatMap(game => game.shots);
};

// Generate insights for multi-game analysis
export interface MultiGameInsight {
  type: 'improvement' | 'decline' | 'consistency' | 'anomaly';
  icon: string;
  title: string;
  description: string;
  games: string[];
  value?: string;
}

export const generateMultiGameInsights = (
  gameComparisons: GameComparisonData[]
): MultiGameInsight[] => {
  const insights: MultiGameInsight[] = [];

  if (gameComparisons.length < 2) return insights;

  // Shot volume trend
  const shotCounts = gameComparisons.map(game => game.shots.length);
  const firstHalf = shotCounts.slice(0, Math.ceil(shotCounts.length / 2));
  const secondHalf = shotCounts.slice(Math.ceil(shotCounts.length / 2));

  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (Math.abs(change) > 15) {
      insights.push({
        type: change > 0 ? 'improvement' : 'decline',
        icon: change > 0 ? '📈' : '📉',
        title: 'Shot Volume Trend',
        description: `Shot volume ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}%`,
        games: gameComparisons.map(g => g.gameId),
        value: `${firstAvg.toFixed(1)} → ${secondAvg.toFixed(1)} shots/game`
      });
    }
  }

  // Shooting percentage trend
  const shootingPercentages = gameComparisons.map(game => {
    const goals = game.shots.filter(s => s.result === 'goal').length;
    return game.shots.length > 0 ? (goals / game.shots.length) * 100 : 0;
  });

  const minPct = Math.min(...shootingPercentages);
  const maxPct = Math.max(...shootingPercentages);

  if (maxPct - minPct > 10) {
    const bestGameIndex = shootingPercentages.indexOf(maxPct);
    const worstGameIndex = shootingPercentages.indexOf(minPct);

    insights.push({
      type: 'anomaly',
      icon: '🎯',
      title: 'Shooting Consistency',
      description: `Wide shooting % range from ${minPct.toFixed(0)}% to ${maxPct.toFixed(0)}%`,
      games: [gameComparisons[bestGameIndex].gameId, gameComparisons[worstGameIndex].gameId],
      value: `${maxPct - minPct > 20 ? 'High' : 'Moderate'} variance`
    });
  }

  // Zone preference changes
  if (gameComparisons.length >= 3) {
    const zoneData = gameComparisons.map(game => {
      const zones = new Map<string, number>();
      game.shots.forEach(shot => {
        const zone = getNormalizedRinkZone(shot.normalizedX, shot.normalizedY);
        zones.set(zone, (zones.get(zone) || 0) + 1);
      });
      return zones;
    });

    // Find most active zone in first vs last game
    const firstGame = zoneData[0];
    const lastGame = zoneData[zoneData.length - 1];

    let biggestChange = { zone: '', change: 0 };
    for (const [zone] of firstGame) {
      const firstCount = firstGame.get(zone) || 0;
      const lastCount = lastGame.get(zone) || 0;
      const firstTotal = Array.from(firstGame.values()).reduce((a, b) => a + b, 0);
      const lastTotal = Array.from(lastGame.values()).reduce((a, b) => a + b, 0);

      if (firstTotal > 0 && lastTotal > 0) {
        const firstPct = (firstCount / firstTotal) * 100;
        const lastPct = (lastCount / lastTotal) * 100;
        const change = lastPct - firstPct;

        if (Math.abs(change) > Math.abs(biggestChange.change)) {
          biggestChange = { zone, change };
        }
      }
    }

    if (Math.abs(biggestChange.change) > 15) {
      insights.push({
        type: 'improvement',
        icon: '🏒',
        title: 'Zone Focus Shift',
        description: `${biggestChange.change > 0 ? 'Increased' : 'Decreased'} activity in ${biggestChange.zone.replace('_', ' ')}`,
        games: [gameComparisons[0].gameId, gameComparisons[gameComparisons.length - 1].gameId],
        value: `${Math.abs(biggestChange.change).toFixed(0)}% change`
      });
    }
  }

  return insights.slice(0, 4); // Limit to 4 insights
};

// Time-based shot filtering utilities
export const filterShotsByTimeRange = (
  shots: NormalizedShotWithGame[],
  games: Game[],
  timeFrom?: number,
  timeTo?: number
): NormalizedShotWithGame[] => {
  if (timeFrom === undefined && timeTo === undefined) {
    return shots;
  }

  return shots.filter(shot => {
    const game = games.find(g => g.id === shot.gameId);
    if (!game) return true;

    // Calculate period time for this shot
    const periodLength = game.periodMinutes * 60; // seconds
    const periodStartTime = (shot.period - 1) * periodLength;
    const shotTimeInPeriod = (shot.timestamp - periodStartTime) / 60; // minutes

    const from = timeFrom ?? 0;
    const to = timeTo ?? game.periodMinutes;

    return shotTimeInPeriod >= from && shotTimeInPeriod <= to;
  });
};

// Enhanced zone statistics with comparison capabilities
export interface EnhancedZoneStats {
  zone: string;
  shots: number;
  goals: number;
  saves: number;
  misses: number;
  blocked: number;
  percentage: number;
  expectedGoals?: number;
  dangerLevel: 'high' | 'medium' | 'low';
  trend?: 'up' | 'down' | 'stable';
}

export const calculateEnhancedZoneStats = (
  shots: NormalizedShotWithGame[],
  previousShots?: NormalizedShotWithGame[]
): EnhancedZoneStats[] => {
  const zones = new Map<string, EnhancedZoneStats>();

  // Process current shots
  shots.forEach(shot => {
    const zoneName = getNormalizedRinkZone(shot.normalizedX, shot.normalizedY);

    if (!zones.has(zoneName)) {
      zones.set(zoneName, {
        zone: zoneName,
        shots: 0,
        goals: 0,
        saves: 0,
        misses: 0,
        blocked: 0,
        percentage: 0,
        dangerLevel: shot.dangerLevel || 'low'
      });
    }

    const zoneStats = zones.get(zoneName)!;
    zoneStats.shots++;

    switch (shot.result) {
      case 'goal':
        zoneStats.goals++;
        break;
      case 'save':
        zoneStats.saves++;
        break;
      case 'miss':
        zoneStats.misses++;
        break;
      case 'blocked':
        zoneStats.blocked++;
        break;
    }
  });

  // Calculate percentages and trends
  for (const [zoneName, stats] of zones) {
    stats.percentage = stats.shots > 0 ? (stats.goals / stats.shots) * 100 : 0;

    // Calculate expected goals based on zone danger
    const expectedRate = stats.dangerLevel === 'high' ? 0.25 :
                        stats.dangerLevel === 'medium' ? 0.15 : 0.08;
    stats.expectedGoals = stats.shots * expectedRate;

    // Calculate trend if previous data available
    if (previousShots) {
      const prevZoneShots = previousShots.filter(s =>
        getNormalizedRinkZone(s.normalizedX, s.normalizedY) === zoneName
      );
      const prevGoals = prevZoneShots.filter(s => s.result === 'goal').length;
      const prevPercentage = prevZoneShots.length > 0 ? (prevGoals / prevZoneShots.length) * 100 : 0;

      const percentageDiff = stats.percentage - prevPercentage;
      stats.trend = Math.abs(percentageDiff) < 2 ? 'stable' :
                   percentageDiff > 0 ? 'up' : 'down';
    }
  }

  return Array.from(zones.values()).filter(zone => zone.shots > 0);
};

// Export utility functions for the components
export {
  getNormalizedRinkZone,
  normalizeShotsArray
};