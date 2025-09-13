import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import type { ShotWithGame } from '../types';
import { TrendingUp, Activity, Zap } from 'lucide-react';

interface AdvancedChartsProps {
  shots: (ShotWithGame & { dangerLevel?: 'high' | 'medium' | 'low' })[];
  className?: string;
}

interface TrendData {
  date: string;
  shots: number;
  goals: number;
  percentage: number;
}

interface PerformanceMetrics {
  metric: string;
  value: number;
  maxValue: number;
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ shots, className = '' }) => {
  // Calculate shot trends over time
  const shotTrends = useMemo(() => {
    if (shots.length === 0) return [];

    // Group shots by date
    const shotsByDate: Record<string, { shots: number; goals: number }> = {};

    shots.forEach(shot => {
      const date = shot.gameDate ? new Date(shot.gameDate).toISOString().split('T')[0] : 'Unknown';
      if (!shotsByDate[date]) {
        shotsByDate[date] = { shots: 0, goals: 0 };
      }
      shotsByDate[date].shots++;
      if (shot.result === 'goal') {
        shotsByDate[date].goals++;
      }
    });

    // Convert to trend data and sort by date
    const trends: TrendData[] = Object.entries(shotsByDate)
      .map(([date, data]) => ({
        date,
        shots: data.shots,
        goals: data.goals,
        percentage: data.shots > 0 ? (data.goals / data.shots) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // Show last 10 data points

    return trends;
  }, [shots]);

  // Calculate performance radar data
  const performanceData = useMemo(() => {
    if (shots.length === 0) return [];

    const totalShots = shots.length;
    const goals = shots.filter(s => s.result === 'goal').length;
    const saves = shots.filter(s => s.result === 'save').length;
    const highDangerShots = shots.filter(s => s.dangerLevel === 'high').length;
    const mediumDangerShots = shots.filter(s => s.dangerLevel === 'medium').length;

    const metrics: PerformanceMetrics[] = [
      {
        metric: 'Shooting %',
        value: totalShots > 0 ? (goals / totalShots) * 100 : 0,
        maxValue: 20 // 20% is excellent
      },
      {
        metric: 'Shot Volume',
        value: totalShots > 0 ? Math.min(totalShots / 5, 100) : 0, // Scale to 100
        maxValue: 100
      },
      {
        metric: 'High Danger %',
        value: totalShots > 0 ? (highDangerShots / totalShots) * 100 : 0,
        maxValue: 40 // 40% high danger shots is excellent
      },
      {
        metric: 'Goalie Pressure',
        value: totalShots > 0 ? ((goals + saves) / totalShots) * 100 : 0,
        maxValue: 100 // 100% shots on goal
      },
      {
        metric: 'Shot Quality',
        value: totalShots > 0 ? ((highDangerShots * 3 + mediumDangerShots * 2) / totalShots) : 0,
        maxValue: 5 // Max quality score
      }
    ];

    return metrics.map(m => ({
      metric: m.metric,
      value: Math.min(m.value, m.maxValue),
      fullMark: m.maxValue
    }));
  }, [shots]);

  // Calculate momentum data (rolling averages)
  const momentumData = useMemo(() => {
    if (shotTrends.length < 3) return [];

    return shotTrends.map((trend, index) => {
      if (index < 2) return { ...trend, momentum: trend.percentage };

      // Calculate 3-game rolling average
      const recentTrends = shotTrends.slice(Math.max(0, index - 2), index + 1);
      const avgPercentage = recentTrends.reduce((sum, t) => sum + t.percentage, 0) / recentTrends.length;

      return {
        ...trend,
        momentum: avgPercentage
      };
    });
  }, [shotTrends]);

  if (shots.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No shot data available for advanced analytics</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Performance Radar */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Team Performance Radar</h3>
        </div>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={performanceData}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12 }}
                className="text-xs sm:text-sm"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 'dataMax']}
                tick={false}
              />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          Larger areas indicate stronger performance in each category
        </div>
      </div>

      {/* Shot Trends */}
      {shotTrends.length > 2 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Shot Trends</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shotTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis yAxisId="shots" orientation="left" />
                <YAxis yAxisId="percentage" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value: number, name: string) => [
                    name === 'percentage' ? `${value.toFixed(1)}%` : value,
                    name === 'shots' ? 'Shots' : name === 'goals' ? 'Goals' : 'Shooting %'
                  ]}
                />
                <Line
                  yAxisId="shots"
                  type="monotone"
                  dataKey="shots"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="shots"
                  type="monotone"
                  dataKey="goals"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="percentage"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Shots</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Goals</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-1 bg-yellow-500"></div>
              <span>Shooting %</span>
            </div>
          </div>
        </div>
      )}

      {/* Momentum Chart */}
      {momentumData.length > 2 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Shooting Momentum</h3>
            <span className="text-sm text-gray-500">(3-game rolling average)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={momentumData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Momentum']}
                />
                <Area
                  type="monotone"
                  dataKey="momentum"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Green area shows smoothed shooting percentage trend. Dashed line shows individual game performance.
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 sm:p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-center">📊 Advanced Analytics Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {performanceData.map((metric) => (
            <div key={metric.metric} className="flex justify-between items-center">
              <span className="font-medium">{metric.metric}:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      metric.value >= metric.fullMark * 0.8 ? 'bg-green-500' :
                      metric.value >= metric.fullMark * 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(metric.value / metric.fullMark) * 100}%` }}
                  ></div>
                </div>
                <span className="w-12 text-right">
                  {metric.metric.includes('%') ? `${metric.value.toFixed(1)}%` : metric.value.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedCharts;