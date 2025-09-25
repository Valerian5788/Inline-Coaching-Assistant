import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, AlertCircle, Minus } from 'lucide-react';
import type { EnhancedZoneStats } from '../../lib/utils/enhancedAnalysis';
import { getZoneDisplayName } from '../../lib/utils/analysis';

interface InteractiveZoneAnalyticsProps {
  zoneStats: EnhancedZoneStats[];
  onZoneClick?: (zone: string) => void;
  selectedZone?: string;
  showComparison?: boolean;
  comparisonData?: EnhancedZoneStats[];
}

const InteractiveZoneAnalytics: React.FC<InteractiveZoneAnalyticsProps> = ({
  zoneStats,
  onZoneClick,
  selectedZone,
  showComparison = false,
  comparisonData
}) => {
  const [sortBy, setSortBy] = useState<'shots' | 'percentage' | 'goals'>('shots');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sort zones based on selected criteria
  const sortedZones = useMemo(() => {
    return [...zoneStats].sort((a, b) => {
      switch (sortBy) {
        case 'shots':
          return b.shots - a.shots;
        case 'percentage':
          return b.percentage - a.percentage;
        case 'goals':
          return b.goals - a.goals;
        default:
          return 0;
      }
    });
  }, [zoneStats, sortBy]);

  // Get danger level color
  const getDangerLevelColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get trend icon and color
  const getTrendDisplay = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return { icon: <TrendingUp className="w-3 h-3" />, color: 'text-green-600' };
      case 'down':
        return { icon: <TrendingDown className="w-3 h-3" />, color: 'text-red-600' };
      case 'stable':
        return { icon: <Minus className="w-3 h-3" />, color: 'text-gray-600' };
      default:
        return null;
    }
  };

  // Calculate efficiency score (goals vs expected)
  const getEfficiencyScore = (zone: EnhancedZoneStats) => {
    if (!zone.expectedGoals || zone.expectedGoals === 0) return 1;
    return zone.goals / zone.expectedGoals;
  };

  // Zone card component
  const ZoneCard: React.FC<{ zone: EnhancedZoneStats; isSelected?: boolean }> = ({ zone, isSelected }) => {
    const efficiency = getEfficiencyScore(zone);
    const trendDisplay = getTrendDisplay(zone.trend);
    const comparisonZone = comparisonData?.find(c => c.zone === zone.zone);

    return (
      <div
        className={`p-6 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
        onClick={() => onZoneClick?.(zone.zone)}
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-lg text-gray-900">
            {getZoneDisplayName(zone.zone as any)}
          </h4>
          <div className="flex items-center space-x-2">
            {trendDisplay && (
              <div className={`flex items-center ${trendDisplay.color}`}>
                {trendDisplay.icon}
              </div>
            )}
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getDangerLevelColor(zone.dangerLevel)}`}>
              {zone.dangerLevel}
            </span>
          </div>
        </div>

        {/* Key Stats - More Prominent */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{zone.shots}</div>
            <div className="text-sm font-medium text-gray-600">Shots</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{zone.percentage.toFixed(1)}%</div>
            <div className="text-sm font-medium text-gray-600">Success Rate</div>
          </div>
        </div>

        {/* Breakdown with Better Spacing */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{zone.goals}</div>
            <div className="text-xs font-medium text-green-700">Goals</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{zone.saves}</div>
            <div className="text-xs font-medium text-blue-700">Saves</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{zone.misses}</div>
            <div className="text-xs font-medium text-gray-700">Misses</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{zone.blocked}</div>
            <div className="text-xs font-medium text-orange-700">Blocked</div>
          </div>
        </div>

        {/* Efficiency indicator */}
        {zone.expectedGoals && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">vs Expected:</span>
            <span className={`font-medium ${
              efficiency > 1.2 ? 'text-green-600' :
              efficiency < 0.8 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {efficiency > 1.2 ? '⬆' : efficiency < 0.8 ? '⬇' : '→'} {(efficiency * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Comparison data */}
        {showComparison && comparisonZone && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-600 mb-1">Comparison:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Shots:</span>
                <span className={`ml-1 font-medium ${
                  zone.shots > comparisonZone.shots ? 'text-green-600' :
                  zone.shots < comparisonZone.shots ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {zone.shots > comparisonZone.shots ? '+' : ''}
                  {zone.shots - comparisonZone.shots}
                </span>
              </div>
              <div>
                <span className="text-gray-500">%:</span>
                <span className={`ml-1 font-medium ${
                  zone.percentage > comparisonZone.percentage ? 'text-green-600' :
                  zone.percentage < comparisonZone.percentage ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {zone.percentage > comparisonZone.percentage ? '+' : ''}
                  {(zone.percentage - comparisonZone.percentage).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // List view component
  const ZoneListItem: React.FC<{ zone: EnhancedZoneStats; isSelected?: boolean }> = ({ zone, isSelected }) => {
    const efficiency = getEfficiencyScore(zone);
    const trendDisplay = getTrendDisplay(zone.trend);

    return (
      <div
        className={`p-3 rounded border cursor-pointer transition-all hover:bg-gray-50 ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
        onClick={() => onZoneClick?.(zone.zone)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="font-medium text-sm">{getZoneDisplayName(zone.zone as any)}</div>
            <span className={`text-xs px-2 py-1 rounded border ${getDangerLevelColor(zone.dangerLevel)}`}>
              {zone.dangerLevel}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-blue-600">{zone.shots}</div>
              <div className="text-xs text-gray-500">Shots</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{zone.goals}</div>
              <div className="text-xs text-gray-500">Goals</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{zone.percentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Success</div>
            </div>
            {zone.expectedGoals && (
              <div className="text-center">
                <div className={`font-medium ${
                  efficiency > 1.2 ? 'text-green-600' :
                  efficiency < 0.8 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {(efficiency * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">vs Exp</div>
              </div>
            )}
            {trendDisplay && (
              <div className={`${trendDisplay.color}`}>
                {trendDisplay.icon}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (zoneStats.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-600">No zone data available</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Clean Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="mb-4 lg:mb-0">
          <h3 className="text-xl font-semibold text-gray-900">Zone Analytics</h3>
          {showComparison && (
            <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2 inline-block">
              Comparison Mode
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="shots">Sort by Shots</option>
            <option value="percentage">Sort by %</option>
            <option value="goals">Sort by Goals</option>
          </select>

          {/* Cleaner view mode toggle */}
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Zone display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedZones.map((zone) => (
            <ZoneCard
              key={zone.zone}
              zone={zone}
              isSelected={selectedZone === zone.zone}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedZones.map((zone) => (
            <ZoneListItem
              key={zone.zone}
              zone={zone}
              isSelected={selectedZone === zone.zone}
            />
          ))}
        </div>
      )}

      {/* Clean Summary Section */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-lg text-gray-900 mb-4">Zone Summary</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {sortedZones.reduce((sum, zone) => sum + zone.shots, 0)}
            </div>
            <div className="text-sm font-medium text-gray-600">Total Shots</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {sortedZones.reduce((sum, zone) => sum + zone.goals, 0)}
            </div>
            <div className="text-sm font-medium text-gray-600">Total Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {sortedZones.length}
            </div>
            <div className="text-sm font-medium text-gray-600">Active Zones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {sortedZones.length > 0 ? sortedZones.reduce((best, zone) =>
                zone.percentage > best.percentage ? zone : best
              ).percentage.toFixed(1) : 0}%
            </div>
            <div className="text-sm font-medium text-gray-600">Best Zone</div>
          </div>
        </div>
      </div>

      {/* Selected zone detail */}
      {selectedZone && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              Selected: {getZoneDisplayName(selectedZone as any)}
            </span>
          </div>
          <div className="text-sm text-blue-700">
            Click on a different zone to compare, or click the same zone to deselect.
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveZoneAnalytics;