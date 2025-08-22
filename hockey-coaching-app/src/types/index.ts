export type Position = 'D' | 'F' | 'G';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: Position;
  teamId: string;
}

export type SeasonType = 'regular' | 'playoffs' | 'tournament';
export type SeasonStatus = 'upcoming' | 'active' | 'completed';

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: SeasonType;
  status: SeasonStatus;
  description?: string;
}

export type GameStatus = 'planned' | 'live' | 'archived';
export type TeamSide = 'home' | 'away';

export interface Game {
  id: string;
  homeTeamId: string;
  awayTeamName: string;
  date: string;
  status: GameStatus;
  seasonId: string;
  periods: number;
  periodMinutes: number;
  hasOvertime: boolean;
  currentPeriod?: number;
  timeRemaining?: number;
  homeScore?: number;
  awayScore?: number;
  teamSide?: TeamSide; // Which side our team defends in current period
}

export type ShotResult = 'goal' | 'save' | 'miss' | 'blocked';

export interface Shot {
  id: string;
  gameId: string;
  period: number;
  timestamp: number;
  x: number; // Rink coordinates
  y: number; // Rink coordinates
  result: ShotResult;
  teamSide: TeamSide;
}

export interface GoalAgainst {
  id: string;
  gameId: string;
  period: number;
  timestamp: number;
  x: number; // Rink coordinates
  y: number; // Rink coordinates
  reason?: string;
}

export type GameEventType = 'period_start' | 'period_end' | 'goal_home' | 'goal_away' | 'timeout' | 'penalty' | 'game_start' | 'game_end';

export interface GameEvent {
  id: string;
  gameId: string;
  type: GameEventType;
  period: number;
  gameTime: number; // Time in seconds from game start
  timestamp: number; // Unix timestamp when event occurred
  description: string;
  data?: any; // Additional event-specific data
}

export interface GameState {
  currentGame: Game | null;
  isTracking: boolean;
  isPaused: boolean;
  startTime: number | null;
  gameTime: number; // Current game time in seconds
  periodStartTime: number | null;
  shots: Shot[];
  goalsAgainst: GoalAgainst[];
  events: GameEvent[];
}

export interface AppState {
  selectedTeam: Team | null;
  currentSeason: Season | null;
}

// Data Analysis Types
export type RinkZone = 'high_slot' | 'low_slot' | 'left_circle' | 'right_circle' | 'left_point' | 'right_point' | 'left_wing' | 'right_wing' | 'center_point';

export interface AnalysisFilters {
  seasonId?: string;
  teamId?: string;
  dateFrom?: string;
  dateTo?: string;
  gameIds?: string[];
}

export interface ZoneStats {
  zone: RinkZone;
  shots: number;
  goals: number;
  saves: number;
  misses: number;
  percentage: number;
}

export interface ShotWithGame extends Shot {
  gameDate: string;
  homeTeamId: string;
  awayTeamName: string;
  seasonId: string;
}

export interface GameStats {
  totalShots: number;
  totalGoals: number;
  totalSaves: number;
  totalMisses: number;
  totalBlocked: number;
  shotsPerGame: number;
  goalPercentage: number;
  savePercentage: number;
}