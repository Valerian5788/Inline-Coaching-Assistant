# Hockey Coaching App - Data Schema Documentation

## Overview

This document provides a comprehensive overview of the data schema used in the Hockey Coaching App. The application uses Firebase Firestore as the primary database with local-first architecture using Zustand for state management.

## Technology Stack

- **Database**: Firebase Firestore (NoSQL document database)
- **State Management**: Zustand with persistence to localStorage
- **Authentication**: Firebase Auth
- **Real-time Updates**: Firestore real-time listeners
- **Local Storage**: Browser localStorage for offline support

## Database Architecture

### Security Model
- **Multi-tenant**: All data is segregated by `userId`
- **Authentication**: Firebase Auth required for all operations
- **Authorization**: Firestore Security Rules ensure users can only access their own data
- **Offline Support**: Local-first architecture with sync when online

### Collections Overview

| Collection | Purpose | Key Relationships |
|------------|---------|------------------|
| `teams` | Hockey teams | Has many players, games |
| `players` | Team players | Belongs to team |
| `seasons` | Competition seasons | Has many games |
| `games` | Individual games | Belongs to season and team, has shots/events |
| `shots` | Shot tracking data | Belongs to game |
| `goalsAgainst` | Goals conceded | Belongs to game |
| `gameEvents` | Game events log | Belongs to game |
| `drills` | Training drills | Standalone with drawing data |
| `practicePlans` | Practice sessions | References drills |
| `tacticalDrawings` | In-game tactical diagrams | Belongs to game |
| `gamePresets` | Game configuration templates | Standalone |

## Data Models

### Core Entities

#### Team
```typescript
interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
  userId: string; // Owner reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore Document Path**: `/teams/{teamId}`

#### Player
```typescript
interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: 'D' | 'F' | 'G'; // Defense, Forward, Goalie
  teamId: string; // Foreign key to Team
  userId: string; // Owner reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore Document Path**: `/players/{playerId}`

#### Season
```typescript
interface Season {
  id: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  type: 'regular' | 'playoffs' | 'tournament';
  status: 'upcoming' | 'active' | 'completed';
  description?: string;
  userId: string; // Owner reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore Document Path**: `/seasons/{seasonId}`

#### Game
```typescript
interface Game {
  id: string;
  homeTeamId: string; // Foreign key to Team
  awayTeamName: string; // External team name
  date: string; // ISO date string
  status: 'planned' | 'live' | 'archived';
  seasonId: string; // Foreign key to Season

  // Game Configuration
  periods: number; // Number of periods
  periodMinutes: number; // Minutes per period
  hasOvertime: boolean;

  // Live Game State
  currentPeriod?: number;
  timeRemaining?: number;
  homeScore?: number;
  awayScore?: number;
  teamSide?: 'home' | 'away'; // Current defending side
  initialTeamSide?: 'left' | 'right'; // Initial rink side
  timeoutUsed?: boolean;

  userId: string; // Owner reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore Document Path**: `/games/{gameId}`

### Game Tracking Data

#### Shot
```typescript
interface Shot {
  id: string;
  gameId: string; // Foreign key to Game
  period: number;
  timestamp: number; // Unix timestamp when shot occurred
  x: number; // Rink X coordinate (0-1 normalized)
  y: number; // Rink Y coordinate (0-1 normalized)
  result: 'goal' | 'save' | 'miss' | 'blocked';
  teamSide: 'home' | 'away'; // Which team took the shot
  synced?: boolean; // Local-first sync tracking
  userId: string; // Owner reference
  createdAt: Timestamp;
}
```

**Firestore Document Path**: `/shots/{shotId}`

#### GoalAgainst
```typescript
interface GoalAgainst {
  id: string;
  gameId: string; // Foreign key to Game
  period: number;
  timestamp: number; // Unix timestamp when goal occurred
  x: number; // Rink X coordinate where goal was scored
  y: number; // Rink Y coordinate where goal was scored
  reason?: string; // Optional reason/description
  synced?: boolean; // Local-first sync tracking
  userId: string; // Owner reference
  createdAt: Timestamp;
}
```

**Firestore Document Path**: `/goalsAgainst/{goalId}`

#### GameEvent
```typescript
interface GameEvent {
  id: string;
  gameId: string; // Foreign key to Game
  type: 'period_start' | 'period_end' | 'goal_home' | 'goal_away' |
        'timeout' | 'penalty' | 'game_start' | 'game_end' |
        'faceoff_won' | 'faceoff_lost' | 'tactical_drawing';
  period: number;
  gameTime: number; // Time in seconds from game start
  timestamp: number; // Unix timestamp when event occurred
  description: string;
  data?: any; // Additional event-specific data
  synced?: boolean; // Local-first sync tracking
  userId: string; // Owner reference
  createdAt: Timestamp;
}
```

**Firestore Document Path**: `/gameEvents/{eventId}`

### Training & Planning Data

#### Drill
```typescript
interface Drill {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: 'Shooting' | 'Passing' | 'Defense' | 'Skating' | 'Other';
  duration?: number; // Duration in minutes
  canvasData?: string; // JSON string of DrawingElement[]

  // Legacy support
  name?: string; // Mapped to title for old data
  elements?: DrillElement[]; // Legacy drawing elements
  drawingElements?: DrawingElement[]; // New enhanced elements

  userId: string; // Owner reference
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

**Firestore Document Path**: `/drills/{drillId}`

#### PracticePlan
```typescript
interface PracticePlan {
  id: string;
  name: string;
  date: string; // ISO date string
  drillIds: string[]; // Array of drill IDs
  notes: string;
  duration: number; // Total duration in minutes
  userId: string; // Owner reference
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

**Firestore Document Path**: `/practicePlans/{planId}`

#### TacticalDrawing
```typescript
interface TacticalDrawing {
  id: string;
  gameId: string; // Foreign key to Game
  elements: DrawingElement[]; // Array of drawing elements
  period: number;
  gameTime: number; // Time in seconds from game start
  timestamp: number; // Unix timestamp when drawing was created
  title?: string;
  notes?: string;
  userId: string; // Owner reference
  createdAt: Timestamp;
}
```

**Firestore Document Path**: `/tacticalDrawings/{drawingId}`

#### GamePreset
```typescript
interface GamePreset {
  id: string;
  name: string;
  periods: number;
  periodMinutes: number;
  hasOvertime: boolean;
  overtimeMinutes?: number;
  isDefault: boolean; // True for system presets, false for user-created
  userId?: string; // Owner reference (not required for default presets)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

**Firestore Document Path**: `/gamePresets/{presetId}`

### Complex Types

#### DrawingElement
```typescript
interface DrawingElement {
  id: string;
  type: 'pointer' | 'arrow' | 'pass_arrow' | 'backward_arrow' |
        'shoot_arrow' | 'puck' | 'defense' | 'offense' |
        'opponent' | 'cone' | 'text';
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number }; // For simple arrows
  path?: { x: number; y: number }[]; // For mouse-following arrows
  label?: string; // For text/markers
  color: 'blue' | 'red' | 'black' | 'yellow';
  selected?: boolean;
  radius?: number; // For circles/pucks
  fontSize?: number; // For text
  isEditing?: boolean; // For inline text editing
}
```

#### AnalysisFilters
```typescript
interface AnalysisFilters {
  seasonId?: string;
  teamId?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  gameIds?: string[];

  // Advanced filters
  periods?: number[];
  shotResults?: ('goal' | 'save' | 'miss' | 'blocked')[];
  scoreSituation?: 'winning' | 'losing' | 'tied' | 'all';
  timeFrom?: number; // Minutes from period start
  timeTo?: number; // Minutes from period start
}
```

## State Management

### Zustand Stores

#### GameStore
Manages live game tracking state with local-first architecture:

- **Persistence**: Partial state persisted to localStorage
- **Real-time Updates**: Timer management for live games
- **Sync Strategy**: Local changes batched and synced to Firebase
- **Offline Support**: Works offline, syncs when connection restored

**Key State**:
```typescript
interface GameState {
  currentGame: Game | null;
  isTracking: boolean;
  isPaused: boolean;
  startTime: number | null;
  gameTime: number; // Current game time in seconds
  periodStartTime: number | null;
  shots: Shot[];
  goalsAgainst: GoalAgainst[];
  events: GameEvent[];

  // Sync state
  pendingChanges: {
    shots: boolean;
    goalsAgainst: boolean;
    events: boolean;
    gameState: boolean;
  };
  lastSyncTime: number | null;
  isSyncing: boolean;
}
```

#### AppStore
Manages global application state:

```typescript
interface AppState {
  selectedTeam: Team | null;
  currentSeason: Season | null;
  activeSeasonId: string | null;
}
```

## Data Flow

### Read Operations
1. **Authentication Check**: Verify user is logged in
2. **Query with User Filter**: All queries include `userId` filter
3. **Real-time Listeners**: Subscribe to document changes
4. **Local State Update**: Update Zustand store
5. **Component Re-render**: React components update automatically

### Write Operations
1. **Local-First Update**: Update Zustand store immediately
2. **Mark as Pending**: Flag changes for sync
3. **Background Sync**: Batch sync to Firebase
4. **Conflict Resolution**: Handle sync conflicts gracefully
5. **Success/Error Handling**: Update UI based on sync result

### Sync Strategy
- **Optimistic Updates**: UI updates immediately
- **Batch Operations**: Multiple changes synced together
- **Retry Logic**: Failed syncs retried automatically
- **Offline Queue**: Changes queued when offline

## Data Relationships

### Entity Relationship Diagram

```
User (Firebase Auth)
├── Teams (1:many)
│   └── Players (1:many)
├── Seasons (1:many)
│   └── Games (1:many)
│       ├── Shots (1:many)
│       ├── GoalsAgainst (1:many)
│       ├── GameEvents (1:many)
│       └── TacticalDrawings (1:many)
├── Drills (1:many)
├── PracticePlans (1:many)
│   └── DrillIds (many:many via array)
└── GamePresets (1:many)
```

### Key Constraints

1. **User Isolation**: All data belongs to authenticated user
2. **Referential Integrity**: Foreign keys maintained at application level
3. **Cascade Deletes**: Handled in application code with batch operations
4. **Data Validation**: Enforced in application layer and TypeScript types

## Analytics & Derived Data

### Shot Analysis
- **Zone Statistics**: Shots grouped by rink zones with success rates
- **Time Analysis**: Shot patterns by period and time
- **Trend Analysis**: Performance over multiple games
- **Heat Maps**: Visual representation of shot locations

### Game Insights
- **Performance Metrics**: Goals, saves, shooting percentage
- **Comparison Tools**: Multi-game analysis
- **Pattern Recognition**: Identify strengths and weaknesses
- **Progress Tracking**: Season-long performance trends

## Security & Privacy

### Firebase Security Rules
```javascript
// Users can only access their own data
match /{collection}/{docId} {
  allow read, write: if resource.data.userId == request.auth.uid;
  allow create: if request.resource.data.userId == request.auth.uid;
}
```

### Data Protection
- **User Isolation**: Complete data separation between users
- **Authentication Required**: All operations require valid Firebase Auth
- **HTTPS Only**: All data transmission encrypted
- **No PII Exposure**: Player names only stored by user choice

## Performance Considerations

### Indexing Strategy
- **Composite Indexes**: Minimal indexes due to client-side filtering
- **Query Optimization**: Limit queries to user data only
- **Pagination**: Not implemented yet, suitable for current data volumes

### Caching Strategy
- **Local Storage**: Zustand persistence for offline access
- **Firestore Cache**: Built-in client-side caching
- **Component Memoization**: React.memo for expensive components

## Migration & Versioning

### Schema Evolution
- **Backward Compatibility**: Optional fields for new features
- **Migration Scripts**: Handle data structure changes
- **Version Detection**: Graceful handling of old data formats

### Legacy Support
- **Drill Elements**: Supports both old and new drawing formats
- **Data Mapping**: Automatic conversion between formats
- **Graceful Degradation**: App works with partial data

## External Integrations

### Firebase Services
- **Firestore**: Primary database
- **Authentication**: User management
- **Analytics**: Usage tracking (optional)
- **Hosting**: Web app deployment

### Browser APIs
- **localStorage**: Offline data persistence
- **Canvas API**: Drawing functionality
- **File API**: Export capabilities (PDF, images)

## Development & Deployment

### Environment Configuration
```bash
# Required environment variables
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234

# Optional
VITE_USE_EMULATOR=true # For local development
```

### Database Setup
1. **Firestore Database**: Create in Firebase Console
2. **Security Rules**: Deploy from `firestore.rules`
3. **Indexes**: Minimal composite indexes needed
4. **Emulator**: Use for local development

## Backup & Recovery

### Data Export
- **Firestore Export**: Use Firebase CLI for full backup
- **User Data Export**: Individual user data export via app
- **Format Support**: JSON, PDF exports available

### Disaster Recovery
- **Firebase Backup**: Automatic daily backups
- **Multi-region**: Firestore multi-region replication
- **Version Control**: All code in Git repository
- **Documentation**: This schema documentation for reference

---

**Last Updated**: Generated automatically
**Version**: 1.0
**Maintainer**: Hockey Coaching App Development Team