import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Trophy, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Game, GameSelectionPreset, ComparisonMode } from '../../types';

interface GameSelectorProps {
  games: Game[];
  selectedGameIds: string[];
  onSelectionChange: (gameIds: string[]) => void;
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  maxSelections?: number;
}

interface GameWithStats extends Game {
  shotCount?: number;
  goalCount?: number;
}

const GameSelector: React.FC<GameSelectorProps> = ({
  games,
  selectedGameIds,
  onSelectionChange,
  comparisonMode,
  onComparisonModeChange,
  maxSelections = 10
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick preset configurations
  const generatePresets = useMemo((): GameSelectionPreset[] => {
    if (games.length === 0) return [];

    const sortedGames = [...games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const presets: GameSelectionPreset[] = [
      {
        id: 'last-3',
        name: 'Last 3 Games',
        description: 'Most recent 3 games',
        gameIds: sortedGames.slice(0, 3).map(g => g.id)
      },
      {
        id: 'last-5',
        name: 'Last 5 Games',
        description: 'Most recent 5 games',
        gameIds: sortedGames.slice(0, 5).map(g => g.id)
      }
    ];

    // Add "This Month" preset if applicable
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthGames = sortedGames.filter(game =>
      new Date(game.date) >= thisMonth
    );

    if (thisMonthGames.length > 0) {
      presets.push({
        id: 'this-month',
        name: 'This Month',
        description: `${thisMonthGames.length} games this month`,
        gameIds: thisMonthGames.map(g => g.id)
      });
    }

    // Add "Full Season" if more than 10 games
    if (games.length <= maxSelections) {
      presets.push({
        id: 'full-season',
        name: 'Full Season',
        description: `All ${games.length} games`,
        gameIds: games.map(g => g.id)
      });
    }

    return presets;
  }, [games, maxSelections]);

  // Filter and sort games for display
  const filteredGames = useMemo(() => {
    let filtered = games;

    if (searchTerm) {
      filtered = games.filter(game =>
        game.awayTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(game.date).toLocaleDateString().includes(searchTerm)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games, searchTerm]);

  const handleGameToggle = (gameId: string) => {
    if (selectedGameIds.includes(gameId)) {
      onSelectionChange(selectedGameIds.filter(id => id !== gameId));
    } else if (selectedGameIds.length < maxSelections) {
      onSelectionChange([...selectedGameIds, gameId]);
    }
  };

  const handlePresetSelect = (preset: GameSelectionPreset) => {
    const validGameIds = preset.gameIds.filter(id => games.some(g => g.id === id));
    onSelectionChange(validGameIds.slice(0, maxSelections));
  };

  const handleSelectAll = () => {
    const visibleGameIds = filteredGames.map(g => g.id).slice(0, maxSelections);
    onSelectionChange(visibleGameIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const formatGameDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const formatGameTitle = (game: Game) => {
    return `vs ${game.awayTeamName}`;
  };

  return (
    <div className="space-y-4">
      {/* Header with comparison mode selector */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Game Selection</h3>
          <span className="text-xs text-gray-500">
            {selectedGameIds.length}/{maxSelections} selected
          </span>
        </div>

        {/* Comparison Mode Toggle */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
          {(['overlay', 'side-by-side', 'aggregate'] as ComparisonMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onComparisonModeChange(mode)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                comparisonMode === mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {mode === 'side-by-side' ? 'Side by Side' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      {generatePresets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Quick Presets</h4>
          <div className="grid grid-cols-2 gap-2">
            {generatePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="p-2 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-xs font-medium text-gray-900">{preset.name}</div>
                <div className="text-xs text-gray-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game List Toggle */}
      <div className="border-t pt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-medium text-gray-600">
            Individual Games ({filteredGames.length})
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Search and controls */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  disabled={filteredGames.length === 0}
                  className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select Visible
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={selectedGameIds.length === 0}
                  className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Game List */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredGames.map((game) => {
                const isSelected = selectedGameIds.includes(game.id);
                const isSelectable = !isSelected && selectedGameIds.length < maxSelections;

                return (
                  <div
                    key={game.id}
                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : isSelectable
                        ? 'hover:bg-gray-50 border border-transparent'
                        : 'opacity-50 cursor-not-allowed border border-transparent'
                    }`}
                    onClick={() => (isSelected || isSelectable) && handleGameToggle(game.id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-900 truncate">
                          {formatGameTitle(game)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatGameDate(game.date)}
                        </span>
                      </div>

                      {/* Game status indicator */}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          game.status === 'archived'
                            ? 'bg-green-100 text-green-700'
                            : game.status === 'live'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {game.status === 'archived' ? 'Completed' : game.status === 'live' ? 'Live' : 'Planned'}
                        </span>

                        {game.status === 'archived' && (
                          <span className="text-xs text-gray-500">
                            {game.homeScore || 0} - {game.awayScore || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredGames.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-500">
                  {searchTerm ? 'No games match your search' : 'No games available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selection limit warning */}
      {selectedGameIds.length >= maxSelections && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs text-amber-700">
            Maximum {maxSelections} games selected for optimal performance.
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSelector;