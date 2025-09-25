import React, { useState } from 'react';
import { Clock, Zap, RotateCcw } from 'lucide-react';
import type { AnalysisFilters } from '../../types';

interface TimeBasedFiltersProps {
  filters: AnalysisFilters;
  onFiltersChange: (filters: AnalysisFilters) => void;
  totalPeriods?: number;
}

const TimeBasedFilters: React.FC<TimeBasedFiltersProps> = ({
  filters,
  onFiltersChange,
  totalPeriods = 3
}) => {
  const selectedPeriods = filters.periods || [];
  const timeRange = {
    from: filters.timeFrom,
    to: filters.timeTo
  };
  const [isTimeRangeExpanded, setIsTimeRangeExpanded] = useState(false);

  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
  const hasOvertime = totalPeriods > 2;

  const handlePeriodToggle = (period: number) => {
    const newPeriods = selectedPeriods.includes(period)
      ? selectedPeriods.filter(p => p !== period)
      : [...selectedPeriods, period];

    onFiltersChange({
      ...filters,
      periods: newPeriods
    });
  };

  const handleSelectAllPeriods = () => {
    onFiltersChange({
      ...filters,
      periods: periods
    });
  };

  const handleClearPeriods = () => {
    onFiltersChange({
      ...filters,
      periods: []
    });
  };

  const handleClutchTimePreset = () => {
    // Last 5 minutes: 15:00-20:00 for 20-minute periods
    onFiltersChange({
      ...filters,
      timeFrom: 15,
      timeTo: 20
    });
    setIsTimeRangeExpanded(true);
  };

  const handleOpeningMinutesPreset = () => {
    // First 5 minutes: 0:00-5:00
    onFiltersChange({
      ...filters,
      timeFrom: 0,
      timeTo: 5
    });
    setIsTimeRangeExpanded(true);
  };

  const handleClearTimeRange = () => {
    onFiltersChange({
      ...filters,
      timeFrom: undefined,
      timeTo: undefined
    });
  };

  const formatTime = (minutes?: number) => {
    if (minutes === undefined) return '';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (value: string): number | undefined => {
    if (!value) return undefined;

    // Handle MM:SS format
    if (value.includes(':')) {
      const [mins, secs] = value.split(':').map(Number);
      if (isNaN(mins) || isNaN(secs)) return undefined;
      return mins + (secs / 60);
    }

    // Handle decimal minutes
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  return (
    <div className="space-y-4">
      {/* Period Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Periods</span>
          </h4>
          <div className="flex space-x-1">
            <button
              onClick={handleSelectAllPeriods}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              All
            </button>
            <span className="text-xs text-gray-400">|</span>
            <button
              onClick={handleClearPeriods}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              None
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {periods.map((period) => {
            const isSelected = selectedPeriods.includes(period);
            const label = period <= 2 ? `${period}st Period`.replace('1st', '1st').replace('2st', '2nd') :
                         period === 3 ? (hasOvertime ? 'OT' : '3rd Period') : `P${period}`;

            return (
              <button
                key={period}
                onClick={() => handlePeriodToggle(period)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Quick period presets */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-gray-600">Period Comparison</h5>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onPeriodChange([1, 2])}
              className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 border"
            >
              1st vs 2nd
            </button>
            {hasOvertime && (
              <button
                onClick={() => onPeriodChange([2, 3])}
                className="px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 border"
              >
                2nd vs OT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Time Range Selection */}
      <div className="space-y-3 border-t pt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsTimeRangeExpanded(!isTimeRangeExpanded)}
            className="text-sm font-medium text-gray-700 flex items-center space-x-2 hover:text-blue-600"
          >
            <Zap className="w-4 h-4" />
            <span>Time Range</span>
            <span className="text-xs text-gray-500">
              {timeRange.from !== undefined || timeRange.to !== undefined ? '(Active)' : '(Optional)'}
            </span>
          </button>
          {(timeRange.from !== undefined || timeRange.to !== undefined) && (
            <button
              onClick={handleClearTimeRange}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick time presets */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleClutchTimePreset}
            className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200"
          >
            🔥 Clutch Time
            <div className="text-xs opacity-75">Last 5 min</div>
          </button>
          <button
            onClick={handleOpeningMinutesPreset}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200"
          >
            🚀 Opening
            <div className="text-xs opacity-75">First 5 min</div>
          </button>
        </div>

        {isTimeRangeExpanded && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-2">
              Specify time range within periods (MM:SS or decimal minutes)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input
                  type="text"
                  placeholder="0:00"
                  value={timeRange.from !== undefined ? formatTime(timeRange.from) : ''}
                  onChange={(e) => {
                    const parsed = parseTimeInput(e.target.value);
                    onFiltersChange({
                      ...filters,
                      timeFrom: parsed
                    });
                  }}
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input
                  type="text"
                  placeholder="20:00"
                  value={timeRange.to !== undefined ? formatTime(timeRange.to) : ''}
                  onChange={(e) => {
                    const parsed = parseTimeInput(e.target.value);
                    onFiltersChange({
                      ...filters,
                      timeTo: parsed
                    });
                  }}
                  className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Examples: "15:30" for 15 minutes 30 seconds, "17.5" for 17.5 minutes
            </div>
          </div>
        )}

        {/* Current time range display */}
        {(timeRange.from !== undefined || timeRange.to !== undefined) && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            Time range: {timeRange.from !== undefined ? formatTime(timeRange.from) : 'Start'} - {timeRange.to !== undefined ? formatTime(timeRange.to) : 'End'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeBasedFilters;