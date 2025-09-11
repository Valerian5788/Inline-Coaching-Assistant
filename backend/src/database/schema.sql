-- Hockey Coaching Assistant Pro - Database Schema
-- PostgreSQL with Google OAuth Authentication

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- AUTHENTICATION & USER MANAGEMENT
-- ==========================================

CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE, -- Google OAuth ID
    
    -- Coach Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    phone VARCHAR(20),
    coaching_license VARCHAR(100),
    years_experience INTEGER,
    certifications TEXT[], -- Array of certifications
    
    -- Account Status
    email_verified BOOLEAN DEFAULT false,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
    
    -- Security & Analytics
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP -- Soft delete
);

CREATE TABLE coach_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL, -- JWT tokens can be long
    device_info JSONB, -- Browser, OS, IP
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- CORE HOCKEY DATA (Multi-tenant)
-- ==========================================

CREATE TABLE teams (
    id UUID PRIMARY KEY, -- Keep same ID from IndexedDB
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(10) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color
    
    -- Team Settings
    league_name VARCHAR(100),
    division VARCHAR(50),
    home_rink VARCHAR(100),
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP, -- From IndexedDB
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE players (
    id UUID PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    jersey_number INTEGER NOT NULL,
    position VARCHAR(1) CHECK (position IN ('D', 'F', 'G')),
    
    -- Extended player info
    birth_date DATE,
    height_cm INTEGER,
    weight_kg INTEGER,
    shoots VARCHAR(1) CHECK (shoots IN ('L', 'R')),
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    UNIQUE(team_id, jersey_number) -- Unique jersey per team
);

CREATE TABLE seasons (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('regular', 'playoffs', 'tournament')),
    status VARCHAR(20) CHECK (status IN ('upcoming', 'active', 'completed')),
    description TEXT,
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE games (
    id UUID PRIMARY KEY,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    away_team_name VARCHAR(100) NOT NULL,
    date TIMESTAMP NOT NULL,
    status VARCHAR(20) CHECK (status IN ('planned', 'live', 'archived')),
    
    -- Game Configuration
    periods INTEGER NOT NULL DEFAULT 2,
    period_minutes INTEGER NOT NULL DEFAULT 25,
    has_overtime BOOLEAN DEFAULT true,
    
    -- Game State
    current_period INTEGER,
    time_remaining INTEGER, -- seconds
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    team_side VARCHAR(10) CHECK (team_side IN ('home', 'away')),
    initial_team_side VARCHAR(10) CHECK (initial_team_side IN ('left', 'right')),
    timeout_used BOOLEAN DEFAULT false,
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ==========================================
-- GAME ANALYTICS & TRACKING
-- ==========================================

CREATE TABLE shots (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    
    period INTEGER NOT NULL,
    timestamp BIGINT NOT NULL, -- Unix timestamp
    x DECIMAL(5,2) NOT NULL, -- Rink coordinates
    y DECIMAL(5,2) NOT NULL,
    result VARCHAR(10) CHECK (result IN ('goal', 'save', 'miss', 'blocked')),
    team_side VARCHAR(10) CHECK (team_side IN ('home', 'away')),
    
    -- Enhanced analytics
    player_id UUID REFERENCES players(id),
    zone VARCHAR(20), -- Computed zone from coordinates
    shot_type VARCHAR(20), -- wrist, slap, backhand, etc.
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE goals_against (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    
    period INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    x DECIMAL(5,2) NOT NULL,
    y DECIMAL(5,2) NOT NULL,
    reason TEXT,
    
    -- Enhanced tracking
    player_id UUID REFERENCES players(id), -- Opposing player if known
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE game_events (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    
    type VARCHAR(30) NOT NULL,
    period INTEGER NOT NULL,
    game_time INTEGER NOT NULL, -- seconds from game start
    timestamp BIGINT NOT NULL, -- Unix timestamp
    description TEXT NOT NULL,
    data JSONB, -- Additional event-specific data
    
    -- Enhanced tracking
    player_id UUID REFERENCES players(id),
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ==========================================
-- DRILL LIBRARY & TRAINING
-- ==========================================

CREATE TABLE drills (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(20) CHECK (category IN ('Shooting', 'Passing', 'Defense', 'Skating', 'Other')),
    duration INTEGER, -- minutes
    
    canvas_data TEXT, -- JSON string of DrawingElement[]
    
    -- Sharing & Community
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE drill_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(drill_id, coach_id)
);

CREATE TABLE practice_plans (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    drill_ids UUID[] DEFAULT '{}', -- Array of drill IDs
    notes TEXT DEFAULT '',
    duration INTEGER NOT NULL, -- minutes
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tactical_drawings (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    
    elements JSONB NOT NULL, -- DrawingElement[]
    period INTEGER NOT NULL,
    game_time INTEGER NOT NULL,
    timestamp BIGINT NOT NULL,
    title VARCHAR(200),
    notes TEXT,
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE game_presets (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    periods INTEGER NOT NULL DEFAULT 2,
    period_minutes INTEGER NOT NULL DEFAULT 25,
    has_overtime BOOLEAN DEFAULT true,
    overtime_minutes INTEGER DEFAULT 5,
    is_default BOOLEAN DEFAULT false,
    
    -- Sync metadata
    last_synced_at TIMESTAMP,
    local_updated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ==========================================
-- COLLABORATION & SHARING
-- ==========================================

CREATE TABLE team_coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'assistant' CHECK (role IN ('owner', 'head_coach', 'assistant', 'observer')),
    permissions JSONB DEFAULT '{"canEdit": true, "canDelete": false}',
    
    invited_by UUID REFERENCES coaches(id),
    invitation_accepted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(team_id, coach_id)
);

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
    
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    
    local_timestamp TIMESTAMP,
    server_timestamp TIMESTAMP DEFAULT NOW(),
    conflict_resolved BOOLEAN DEFAULT false,
    
    old_data JSONB,
    new_data JSONB,
    
    device_id VARCHAR(100), -- For identifying sync source
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- INDEXES & PERFORMANCE
-- ==========================================

-- Authentication indexes
CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_coaches_google_id ON coaches(google_id);
CREATE INDEX idx_coach_sessions_token ON coach_sessions(session_token);
CREATE INDEX idx_coach_sessions_expires ON coach_sessions(expires_at);

-- Core data indexes
CREATE INDEX idx_teams_coach_id ON teams(coach_id);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_seasons_coach_id ON seasons(coach_id);
CREATE INDEX idx_games_season_id ON games(season_id);
CREATE INDEX idx_games_date ON games(date);

-- Analytics indexes
CREATE INDEX idx_shots_game_id ON shots(game_id);
CREATE INDEX idx_shots_coordinates ON shots(x, y);
CREATE INDEX idx_goals_against_game_id ON goals_against(game_id);
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_type ON game_events(type);

-- Drill library indexes
CREATE INDEX idx_drills_coach_id ON drills(coach_id);
CREATE INDEX idx_drills_category ON drills(category);
CREATE INDEX idx_drills_tags ON drills USING GIN(tags);
CREATE INDEX idx_drills_public ON drills(is_public) WHERE is_public = true;

-- Collaboration indexes
CREATE INDEX idx_team_coaches_team_id ON team_coaches(team_id);
CREATE INDEX idx_team_coaches_coach_id ON team_coaches(coach_id);

-- Sync indexes
CREATE INDEX idx_sync_logs_coach_id ON sync_logs(coach_id);
CREATE INDEX idx_sync_logs_record ON sync_logs(table_name, record_id);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(server_timestamp);

-- ==========================================
-- ROW LEVEL SECURITY (Multi-tenant)
-- ==========================================

-- Enable RLS on all coach-owned tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals_against ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_presets ENABLE ROW LEVEL SECURITY;

-- Function to get current coach ID from application context
CREATE OR REPLACE FUNCTION current_coach_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_coach_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY coach_teams_policy ON teams
    FOR ALL TO PUBLIC
    USING (coach_id = current_coach_id());

CREATE POLICY coach_seasons_policy ON seasons
    FOR ALL TO PUBLIC
    USING (coach_id = current_coach_id());

CREATE POLICY coach_drills_policy ON drills
    FOR ALL TO PUBLIC
    USING (coach_id = current_coach_id() OR is_public = true);

CREATE POLICY coach_practice_plans_policy ON practice_plans
    FOR ALL TO PUBLIC
    USING (coach_id = current_coach_id());

CREATE POLICY coach_game_presets_policy ON game_presets
    FOR ALL TO PUBLIC
    USING (coach_id = current_coach_id());

-- Players policy (through team ownership)
CREATE POLICY coach_players_policy ON players
    FOR ALL TO PUBLIC
    USING (team_id IN (SELECT id FROM teams WHERE coach_id = current_coach_id()));

-- Games policy (through season ownership)
CREATE POLICY coach_games_policy ON games
    FOR ALL TO PUBLIC
    USING (season_id IN (SELECT id FROM seasons WHERE coach_id = current_coach_id()));

-- Shots policy (through game ownership)
CREATE POLICY coach_shots_policy ON shots
    FOR ALL TO PUBLIC
    USING (game_id IN (
        SELECT g.id FROM games g 
        JOIN seasons s ON g.season_id = s.id 
        WHERE s.coach_id = current_coach_id()
    ));

-- Similar policies for other game-related tables
CREATE POLICY coach_goals_against_policy ON goals_against
    FOR ALL TO PUBLIC
    USING (game_id IN (
        SELECT g.id FROM games g 
        JOIN seasons s ON g.season_id = s.id 
        WHERE s.coach_id = current_coach_id()
    ));

CREATE POLICY coach_game_events_policy ON game_events
    FOR ALL TO PUBLIC
    USING (game_id IN (
        SELECT g.id FROM games g 
        JOIN seasons s ON g.season_id = s.id 
        WHERE s.coach_id = current_coach_id()
    ));

CREATE POLICY coach_tactical_drawings_policy ON tactical_drawings
    FOR ALL TO PUBLIC
    USING (game_id IN (
        SELECT g.id FROM games g 
        JOIN seasons s ON g.season_id = s.id 
        WHERE s.coach_id = current_coach_id()
    ));