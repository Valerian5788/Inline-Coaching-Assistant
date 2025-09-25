import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus, Home, Plane } from 'lucide-react';
import type { ShotResult, AnalysisFilters } from '../../types';

interface AdvancedFiltersProps {
  filters: AnalysisFilters;
  onFiltersChange: (filters: AnalysisFilters) => void;
  gameCount: number;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  gameCount
}) => {
  const selectedShotResults = filters.shotResults || [];
  const scoreSituation = filters.scoreSituation || 'all';
  const showGoalsAgainst = false; // This could be added to filters later
  const shotResults: { value: ShotResult; label: string; color: string; icon: React.ReactNode }[] = [
    {
      value: 'goal',
      label: 'Goals',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: <Target className="w-3 h-3" />
    },
    {
      value: 'save',
      label: 'Saves',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <div className="w-3 h-3 bg-blue-500 rounded-full" />
    },
    {
      value: 'miss',
      label: 'Misses',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <div className="w-3 h-3 border border-gray-400 rounded-full" />
    },
    {
      value: 'blocked',
      label: 'Blocked',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: <div className="w-3 h-3 bg-orange-500 rounded" />
    }
  ];

  const scoreSituations: { value: 'winning' | 'losing' | 'tied' | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    {
      value: 'all',
      label: 'All Situations',
      icon: <Minus className="w-3 h-3" />,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    {
      value: 'winning',
      label: 'When Winning',
      icon: <TrendingUp className="w-3 h-3" />,
      color: 'bg-green-100 text-green-700 border-green-200'
    },
    {
      value: 'tied',
      label: 'When Tied',
      icon: <Minus className="w-3 h-3" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    {
      value: 'losing',
      label: 'When Losing',
      icon: <TrendingDown className="w-3 h-3" />,
      color: 'bg-red-100 text-red-700 border-red-200'
    }
  ];

  const handleShotResultToggle = (result: ShotResult) => {
    const newShotResults = selectedShotResults.includes(result)
      ? selectedShotResults.filter(r => r !== result)
      : [...selectedShotResults, result];

    onFiltersChange({
      ...filters,
      shotResults: newShotResults
    });
  };

  const handleSelectAllShotResults = () => {
    onFiltersChange({
      ...filters,
      shotResults: ['goal', 'save', 'miss', 'blocked']
    });
  };

  const handleClearShotResults = () => {
    onFiltersChange({
      ...filters,
      shotResults: []
    });
  };

  return (
    <div className="space-y-4">
      {/* Shot Results Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Shot Results</h4>
          <div className="flex space-x-1">
            <button
              onClick={handleSelectAllShotResults}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              All
            </button>
            <span className="text-xs text-gray-400">|</span>
            <button
              onClick={handleClearShotResults}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              None
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {shotResults.map((result) => {
            const isSelected = selectedShotResults.includes(result.value);

            return (
              <button
                key={result.value}
                onClick={() => handleShotResultToggle(result.value)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  isSelected
                    ? result.color
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {result.icon}
                <span>{result.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick preset for goals only */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, shotResults: ['goal'] })}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
          >
            Goals Only
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, shotResults: ['goal', 'save'] })}
            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
          >
            On Target
          </button>
        </div>
      </div>

      {/* Score Situation Filter */}
      <div className="space-y-3 border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700">Game Situation</h4>

        <div className="grid grid-cols-1 gap-2">
          {scoreSituations.map((situation) => {
            const isSelected = scoreSituation === situation.value;

            return (
              <button
                key={situation.value}
                onClick={() => onFiltersChange({ ...filters, scoreSituation: situation.value })}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  isSelected
                    ? situation.color
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {situation.icon}
                <span>{situation.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          Score situation is determined at the time each shot was taken
        </div>
      </div>

      {/* Goals Against Toggle - Future enhancement */}
      {/*
      <div className="space-y-3 border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700">Defensive Analysis</h4>
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          Goals against analysis coming soon
        </div>
      </div>
      */}

      {/* Filter Summary */}
      <div className="border-t pt-3">
        <h5 className="text-xs font-medium text-gray-600 mb-2">Active Filters</h5>
        <div className="space-y-1">
          {selectedShotResults.length > 0 && selectedShotResults.length < 4 && (
            <div className="text-xs text-blue-600">
              Shot results: {selectedShotResults.join(', ')}
            </div>
          )}
          {scoreSituation !== 'all' && (
            <div className="text-xs text-blue-600">
              Situation: {scoreSituation}
            </div>
          )}
          {showGoalsAgainst && (
            <div className="text-xs text-blue-600">
              Including goals against
            </div>
          )}
          {selectedShotResults.length === 0 && scoreSituation === 'all' && !showGoalsAgainst && (
            <div className="text-xs text-gray-500">No advanced filters active</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;