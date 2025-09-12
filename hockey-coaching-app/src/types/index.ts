export type Position = 'D' | 'F' | 'G';


export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
  userId: string; // Owner of this team
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: Position;
  teamId: string;
  userId: string; // Owner of this player
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
  userId: string; // Owner of this season
}

export type GameStatus = 'planned' | 'live' | 'archived';
export type TeamSide = 'home' | 'away';
export type RinkSide = 'left' | 'right';

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
  initialTeamSide?: RinkSide; // Which side of rink team defends first period
  timeoutUsed?: boolean; // Whether timeout has been used
  userId: string; // Owner of this game
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

export type GameEventType = 'period_start' | 'period_end' | 'goal_home' | 'goal_away' | 'timeout' | 'penalty' | 'game_start' | 'game_end' | 'faceoff_won' | 'faceoff_lost' | 'tactical_drawing';

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

// Training/Drill Types
export type DrillCategory = 'Shooting' | 'Passing' | 'Defense' | 'Skating' | 'Other';

export type DrawingToolType = 
  | 'pointer' // Select/move tool
  | 'arrow' // Normal movement arrow (follows mouse)
  | 'pass_arrow' // Pass arrow (follows mouse)
  | 'backward_arrow' // Backward skating arrow (follows mouse)
  | 'shoot_arrow' // Shooting arrow (follows mouse)
  | 'puck' // Small black dot
  | 'defense' // D marker
  | 'offense' // O marker  
  | 'opponent' // X marker
  | 'cone' // Triangle cone
  | 'text'; // Text annotation with inline editing

export type DrawingColor = 'blue' | 'red' | 'black' | 'yellow';
export type LineStyle = 'solid' | 'dashed' | 'zigzag';
export type PlayerPosition = 'F1' | 'F2' | 'F3' | 'D1' | 'D2' | 'G' | 'C';

export interface DrawingElement {
  id: string;
  type: DrawingToolType;
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number }; // For simple arrows
  path?: { x: number; y: number }[]; // For mouse-following arrows
  label?: string; // For text/markers
  color: DrawingColor;
  selected?: boolean;
  radius?: number; // For circles/pucks
  fontSize?: number; // For text
  isEditing?: boolean; // For inline text editing
}

// Legacy support - keep DrillElement for backward compatibility
export interface DrillElement {
  type: 'arrow' | 'circle' | 'x';
  id: string;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  center?: { x: number; y: number };
  position?: { x: number; y: number };
  label?: string;
  color?: string;
}

export interface Drill {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: DrillCategory;
  duration?: number; // Duration in minutes
  canvasData?: string; // JSON string of DrawingElement[]
  // Legacy support - backward compatibility
  name?: string; // Mapped to title for old data
  elements?: DrillElement[]; // Legacy elements
  drawingElements?: DrawingElement[]; // New enhanced elements
  createdAt: string;
  updatedAt: string;
  userId: string; // Owner of this drill
}

// Tactical drawings for live game tracking
export interface TacticalDrawing {
  id: string;
  gameId: string;
  elements: DrawingElement[];
  period: number;
  gameTime: number; // Time in seconds from game start
  timestamp: number; // Unix timestamp when drawing was created
  title?: string;
  notes?: string;
}

export interface PracticePlan {
  id: string;
  name: string;
  date: string;
  drillIds: string[];
  notes: string;
  duration: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

// Enhanced practice plan item for better UX
export interface PracticePlanItem {
  id: string;
  drillId?: string;
  type: 'drill' | 'break' | 'scrimmage' | 'warm_up' | 'cool_down';
  title: string;
  duration: number; // in minutes
  notes?: string;
  order: number;
}

export interface EnhancedPracticePlan {
  id: string;
  name: string;
  date: string;
  items: PracticePlanItem[];
  totalDuration: number; // computed from items
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GamePreset {
  id: string;
  name: string;
  periods: number;
  periodMinutes: number;
  hasOvertime: boolean;
  overtimeMinutes?: number;
  isDefault: boolean; // True for system presets (Senior/Junior), false for user-created
  createdAt: string;
  updatedAt: string;
}

