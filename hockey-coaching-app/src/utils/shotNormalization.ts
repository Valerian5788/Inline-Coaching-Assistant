import type { Shot, ShotWithGame, Game, GoalAgainst, RinkZone } from '../types';

export interface NormalizedShot extends Shot {
  normalizedX: number;
  normalizedY: number;
  dangerLevel?: 'high' | 'medium' | 'low';
}

export interface NormalizedShotWithGame extends ShotWithGame {
  normalizedX: number;
  normalizedY: number;
  dangerLevel?: 'high' | 'medium' | 'low';
}

export interface NormalizedGoalAgainst extends GoalAgainst {
  normalizedX: number;
  normalizedY: number;
}

/**
 * Determines which side the team is defending in a given period
 */
export const getTeamSideForPeriod = (game: Game, period: number): 'left' | 'right' => {
  if (!game.initialTeamSide) {
    return 'left'; // Default fallback
  }

  // Teams alternate sides each period
  // Period 1: initial side, Period 2: opposite side, Period 3: initial side, etc.
  const isOddPeriod = period % 2 === 1;
  return isOddPeriod ? game.initialTeamSide : (game.initialTeamSide === 'left' ? 'right' : 'left');
};

/**
 * Normalizes shots to always show team "Always Attacking Right"
 * For periods when defending LEFT: Keep shots as-is
 * For periods when defending RIGHT: Mirror BOTH x AND y coordinates
 */
export function normalizeShot<T extends Shot>(shot: T, game: Game): T & { normalizedX: number; normalizedY: number } {
  const teamSide = getTeamSideForPeriod(game, shot.period);
  
  if (teamSide === 'left') {
    // Defending left, attacking right - coordinates are correct
    return {
      ...shot,
      normalizedX: shot.x,
      normalizedY: shot.y
    };
  } else {
    // Defending right, attacking left - rotate 180 degrees
    return {
      ...shot,
      normalizedX: 1 - shot.x,  // Mirror X
      normalizedY: 1 - shot.y   // Mirror Y (CRITICAL!)
    };
  }
}

/**
 * Normalizes goals against to always show on defensive zone (left side)
 */
export function normalizeGoalAgainst(goalAgainst: GoalAgainst, game: Game): NormalizedGoalAgainst {
  const teamSide = getTeamSideForPeriod(game, goalAgainst.period);
  
  if (teamSide === 'left') {
    // Defending left - coordinates are correct
    return {
      ...goalAgainst,
      normalizedX: goalAgainst.x,
      normalizedY: goalAgainst.y
    };
  } else {
    // Defending right - rotate 180 degrees
    return {
      ...goalAgainst,
      normalizedX: 1 - goalAgainst.x,
      normalizedY: 1 - goalAgainst.y
    };
  }
}

/**
 * Determines shot danger level based on normalized coordinates
 */
export const getShotDangerLevel = (normalizedX: number, normalizedY: number): 'high' | 'medium' | 'low' => {
  // High danger: Slot area and close to goal
  if (normalizedX >= 0.75 && normalizedY >= 0.35 && normalizedY <= 0.65) {
    return 'high';
  }
  
  // Medium danger: Circles and close areas
  if (normalizedX >= 0.6) {
    return 'medium';
  }
  
  // Low danger: Points and beyond
  return 'low';
};

/**
 * Enhanced zone definitions for normalized view (team always attacking right)
 */
export const NORMALIZED_ZONES = {
  // Defensive zones (left side - where we defend)
  defensiveSlot: { x: [0, 0.25], y: [0.35, 0.65] },
  defensiveLeftCircle: { x: [0, 0.25], y: [0, 0.35] },
  defensiveRightCircle: { x: [0, 0.25], y: [0.65, 1] },
  
  // Neutral zone
  neutral: { x: [0.25, 0.75], y: [0, 1] },
  
  // Offensive zones (right side - where we attack)
  offensiveSlot: { x: [0.75, 1], y: [0.35, 0.65] },
  offensiveLeftCircle: { x: [0.75, 1], y: [0, 0.35] },
  offensiveRightCircle: { x: [0.75, 1], y: [0.65, 1] },
  offensivePoint: { x: [0.6, 0.75], y: [0.3, 0.7] }
};

/**
 * Gets normalized rink zone based on normalized coordinates
 */
export const getNormalizedRinkZone = (normalizedX: number, normalizedY: number): RinkZone => {
  // Offensive zones (right side - attacking)
  if (normalizedX >= 0.65) {
    // Close to goal zones
    if (normalizedY <= 0.35) {
      return 'left_circle';
    } else if (normalizedY >= 0.65) {
      return 'right_circle';
    } else {
      return normalizedX >= 0.8 ? 'low_slot' : 'high_slot';
    }
  } else if (normalizedX >= 0.5) {
    // Medium distance zones
    if (normalizedY <= 0.3) {
      return 'left_wing';
    } else if (normalizedY >= 0.7) {
      return 'right_wing';
    } else {
      return 'center_point';
    }
  } else {
    // Defensive/far zones (left side)
    if (normalizedY <= 0.35) {
      return 'left_point';
    } else if (normalizedY >= 0.65) {
      return 'right_point';
    } else {
      return 'center_point';
    }
  }
};

/**
 * Normalize an array of shots with enhanced data
 */
export const normalizeShotsArray = <T extends Shot>(shots: T[], games: Game[]): Array<T & { normalizedX: number; normalizedY: number; dangerLevel: 'high' | 'medium' | 'low' }> => {
  // Create a game lookup map for performance
  const gameMap = new Map(games.map(game => [game.id, game]));
  
  return shots.map(shot => {
    const game = gameMap.get(shot.gameId);
    if (!game) {
      // Fallback if game not found
      return {
        ...shot,
        normalizedX: shot.x,
        normalizedY: shot.y,
        dangerLevel: getShotDangerLevel(shot.x, shot.y) as 'high' | 'medium' | 'low'
      };
    }
    
    const normalized = normalizeShot(shot, game);
    const dangerLevel = getShotDangerLevel(normalized.normalizedX, normalized.normalizedY);
    
    return {
      ...normalized,
      dangerLevel
    };
  });
};

/**
 * Smart insights generation based on normalized shot data
 */
export interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  icon: string;
  text: string;
  value?: string;
}

export const generateSmartInsights = (normalizedShots: NormalizedShotWithGame[]): Insight[] => {
  const insights: Insight[] = [];
  
  if (normalizedShots.length === 0) return insights;
  
  // Hot Zone Analysis
  const zoneShots = new Map<string, { shots: number; goals: number }>();
  
  normalizedShots.forEach(shot => {
    const zone = getNormalizedRinkZone(shot.normalizedX, shot.normalizedY);
    const current = zoneShots.get(zone) || { shots: 0, goals: 0 };
    current.shots++;
    if (shot.result === 'goal') current.goals++;
    zoneShots.set(zone, current);
  });
  
  // Find hot zones
  let hottestZone = '';
  let maxShots = 0;
  
  for (const [zone, stats] of zoneShots) {
    if (stats.shots > maxShots) {
      maxShots = stats.shots;
      hottestZone = zone;
    }
  }
  
  if (hottestZone && maxShots > 3) {
    const stats = zoneShots.get(hottestZone)!;
    const percentage = ((stats.goals / stats.shots) * 100).toFixed(0);
    insights.push({
      type: stats.goals / stats.shots > 0.15 ? 'positive' : 'neutral',
      icon: '🔥',
      text: `Hot Zone: ${percentage}% shooting from ${hottestZone.replace('_', ' ')}`,
      value: `${stats.goals}/${stats.shots}`
    });
  }
  
  // Cold streak analysis
  const recentShots = normalizedShots.slice(-12); // Last 12 shots
  const recentGoals = recentShots.filter(s => s.result === 'goal').length;
  
  if (recentShots.length >= 8 && recentGoals === 0) {
    insights.push({
      type: 'negative',
      icon: '❄️',
      text: `Cold Streak: 0/${recentShots.length} recent shots`,
    });
  }
  
  // Period momentum
  const periodShots = new Map<number, number>();
  normalizedShots.forEach(shot => {
    periodShots.set(shot.period, (periodShots.get(shot.period) || 0) + 1);
  });
  
  if (periodShots.size > 1) {
    const p1Shots = periodShots.get(1) || 0;
    const p3Shots = periodShots.get(3) || 0;
    
    if (p3Shots > p1Shots * 1.4) {
      insights.push({
        type: 'positive',
        icon: '📈',
        text: `3rd Period: Shot volume up ${Math.round(((p3Shots - p1Shots) / p1Shots) * 100)}%`,
        value: `${p3Shots} vs ${p1Shots}`
      });
    }
  }
  
  // Slot success rate
  const slotShots = normalizedShots.filter(s => 
    s.normalizedX >= 0.75 && s.normalizedY >= 0.35 && s.normalizedY <= 0.65
  );
  
  if (slotShots.length > 3) {
    const slotGoals = slotShots.filter(s => s.result === 'goal').length;
    const slotPercentage = ((slotGoals / slotShots.length) * 100).toFixed(0);
    
    insights.push({
      type: parseInt(slotPercentage) > 15 ? 'positive' : 'neutral',
      icon: '💪',
      text: `Slot Success: ${slotPercentage}% vs 11% average`,
      value: `${slotGoals}/${slotShots.length}`
    });
  }
  
  return insights.slice(0, 4); // Limit to 4 insights
};