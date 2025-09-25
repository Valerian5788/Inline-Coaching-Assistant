import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertCircle,
  Trophy,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { MultiGameInsight } from '../../lib/utils/enhancedAnalysis';
import type { EnhancedZoneStats } from '../../lib/utils/enhancedAnalysis';
import type { NormalizedShotWithGame } from '../../utils/shotNormalization';

interface EnhancedInsightsPanelProps {
  shots: NormalizedShotWithGame[];
  zoneStats: EnhancedZoneStats[];
  multiGameInsights?: MultiGameInsight[];
  gameCount: number;
  periodBreakdown?: Array<{ period: string; shots: number; goals: number }>;
  className?: string;
}

interface InsightCard {
  id: string;
  type: 'strength' | 'opportunity' | 'warning' | 'trend';
  icon: React.ReactNode;
  title: string;
  description: string;
  value?: string;
  action?: string;
  priority: number; // 1-10, higher = more important
}

const EnhancedInsightsPanel: React.FC<EnhancedInsightsPanelProps> = ({
  shots,
  zoneStats,
  multiGameInsights = [],
  gameCount,
  periodBreakdown = [],
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedInsightType, setSelectedInsightType] = useState<'all' | 'strength' | 'opportunity' | 'warning' | 'trend'>('all');

  // Generate comprehensive insights
  const generatedInsights = useMemo((): InsightCard[] => {
    const insights: InsightCard[] = [];

    if (shots.length === 0) return insights;

    // 1. Hot Zone Analysis
    const hottestZone = zoneStats.reduce((max, zone) =>
      zone.shots > max.shots ? zone : max, zoneStats[0]
    );

    if (hottestZone && hottestZone.shots >= 3) {
      insights.push({
        id: 'hot-zone',
        type: hottestZone.percentage > 15 ? 'strength' : 'opportunity',
        icon: <Target className="w-4 h-4" />,
        title: 'Hot Zone Identified',
        description: `${hottestZone.zone.replace('_', ' ')} shows highest activity`,
        value: `${hottestZone.shots} shots, ${hottestZone.percentage.toFixed(0)}% success`,
        action: hottestZone.percentage > 15 ? 'Keep utilizing this zone' : 'Work on accuracy from this position',
        priority: 8
      });
    }

    // 2. Shooting Efficiency Analysis
    const totalShots = shots.length;
    const totalGoals = shots.filter(s => s.result === 'goal').length;
    const shootingPct = totalShots > 0 ? (totalGoals / totalShots) * 100 : 0;

    if (totalShots >= 5) {
      const isGoodEfficiency = shootingPct > 12;
      insights.push({
        id: 'shooting-efficiency',
        type: isGoodEfficiency ? 'strength' : 'opportunity',
        icon: isGoodEfficiency ? <Trophy className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />,
        title: isGoodEfficiency ? 'Strong Shooting' : 'Shooting Opportunity',
        description: `${shootingPct.toFixed(1)}% shooting percentage`,
        value: `${totalGoals}/${totalShots} shots converted`,
        action: isGoodEfficiency ? 'Maintain shooting selection' : 'Focus on shot quality and positioning',
        priority: isGoodEfficiency ? 7 : 9
      });
    }

    // 3. High Danger Shot Analysis
    const highDangerShots = shots.filter(s => s.dangerLevel === 'high');
    const highDangerGoals = highDangerShots.filter(s => s.result === 'goal').length;
    const highDangerPct = highDangerShots.length > 0 ? (highDangerGoals / highDangerShots.length) * 100 : 0;

    if (highDangerShots.length >= 2) {
      insights.push({
        id: 'high-danger',
        type: highDangerPct > 25 ? 'strength' : 'opportunity',
        icon: <Zap className="w-4 h-4" />,
        title: 'High Danger Chances',
        description: `${highDangerShots.length} high-danger opportunities`,
        value: `${highDangerPct.toFixed(0)}% conversion rate`,
        action: highDangerPct > 25 ? 'Continue creating high-danger chances' : 'Work on finishing in tight',
        priority: 8
      });
    }

    // 4. Period Performance Analysis
    if (periodBreakdown.length > 1) {
      const periods = periodBreakdown.filter(p => p.period !== 'All Game');
      const periodShotCounts = periods.map(p => p.shots);
      const maxShots = Math.max(...periodShotCounts);
      const minShots = Math.min(...periodShotCounts);

      if (maxShots - minShots > 3) {
        const strongPeriod = periods.find(p => p.shots === maxShots);
        const weakPeriod = periods.find(p => p.shots === minShots);

        insights.push({
          id: 'period-consistency',
          type: 'trend',
          icon: <Activity className="w-4 h-4" />,
          title: 'Period Variability',
          description: `Inconsistent shot volume across periods`,
          value: `${strongPeriod?.period}: ${maxShots}, ${weakPeriod?.period}: ${minShots}`,
          action: 'Focus on consistent intensity throughout game',
          priority: 6
        });
      }
    }

    // 5. Shot Location Diversity
    const activeZones = zoneStats.filter(z => z.shots > 0).length;
    const totalZonesAvailable = 9; // Based on the zone system

    if (activeZones < 4 && totalShots >= 8) {
      insights.push({
        id: 'shot-diversity',
        type: 'opportunity',
        icon: <Target className="w-4 h-4" />,
        title: 'Limited Shot Diversity',
        description: `Shots from only ${activeZones} zone${activeZones !== 1 ? 's' : ''}`,
        value: `${((activeZones / totalZonesAvailable) * 100).toFixed(0)}% zone coverage`,
        action: 'Vary shot locations to create unpredictability',
        priority: 5
      });
    }

    // 6. Save vs Miss Analysis
    const saves = shots.filter(s => s.result === 'save').length;
    const misses = shots.filter(s => s.result === 'miss').length;
    const onTargetPct = totalShots > 0 ? ((saves + totalGoals) / totalShots) * 100 : 0;

    if (totalShots >= 5) {
      if (onTargetPct < 60) {
        insights.push({
          id: 'shot-accuracy',
          type: 'opportunity',
          icon: <AlertCircle className="w-4 h-4" />,
          title: 'Shot Accuracy',
          description: `${misses} missed shots affecting efficiency`,
          value: `${onTargetPct.toFixed(0)}% on target`,
          action: 'Focus on shooting drills and setup',
          priority: 7
        });
      }
    }

    // 7. Blocked Shot Analysis
    const blockedShots = shots.filter(s => s.result === 'blocked').length;
    const blockedPct = totalShots > 0 ? (blockedShots / totalShots) * 100 : 0;

    if (blockedPct > 20 && blockedShots >= 2) {
      insights.push({
        id: 'blocked-shots',
        type: 'warning',
        icon: <AlertCircle className="w-4 h-4" />,
        title: 'High Block Rate',
        description: `${blockedShots} shots blocked`,
        value: `${blockedPct.toFixed(0)}% of shots blocked`,
        action: 'Work on creating better shooting lanes',
        priority: 6
      });
    }

    // 8. Multi-game trends (if available)
    multiGameInsights.forEach((insight, index) => {
      insights.push({
        id: `multi-game-${index}`,
        type: insight.type === 'improvement' ? 'strength' :
              insight.type === 'decline' ? 'warning' : 'trend',
        icon: <TrendingUp className="w-4 h-4" />,
        title: insight.title,
        description: insight.description,
        value: insight.value,
        action: insight.type === 'improvement' ? 'Maintain this positive trend' :
                insight.type === 'decline' ? 'Address this declining area' : 'Monitor this trend',
        priority: 7
      });
    });

    // Sort by priority (high to low) and limit to most important
    return insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }, [shots, zoneStats, multiGameInsights, periodBreakdown]);

  // Filter insights based on selected type
  const filteredInsights = useMemo(() => {
    if (selectedInsightType === 'all') return generatedInsights;
    return generatedInsights.filter(insight => insight.type === selectedInsightType);
  }, [generatedInsights, selectedInsightType]);

  // Get icon and color for insight type
  const getInsightTypeDisplay = (type: InsightCard['type']) => {
    switch (type) {
      case 'strength':
        return { color: 'bg-green-50 border-green-200 text-green-700', badge: '💪' };
      case 'opportunity':
        return { color: 'bg-blue-50 border-blue-200 text-blue-700', badge: '🎯' };
      case 'warning':
        return { color: 'bg-red-50 border-red-200 text-red-700', badge: '⚠️' };
      case 'trend':
        return { color: 'bg-purple-50 border-purple-200 text-purple-700', badge: '📈' };
      default:
        return { color: 'bg-gray-50 border-gray-200 text-gray-700', badge: 'ℹ️' };
    }
  };

  if (shots.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <div className="text-gray-600">No data available for insights</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Clean Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Smart Insights</h3>
                <p className="text-sm text-gray-600">{filteredInsights.length} insights found</p>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={selectedInsightType}
              onChange={(e) => setSelectedInsightType(e.target.value as typeof selectedInsightType)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Insights</option>
              <option value="strength">💪 Strengths</option>
              <option value="opportunity">🎯 Opportunities</option>
              <option value="warning">⚠️ Warnings</option>
              <option value="trend">📈 Trends</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No insights available for the selected filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInsights.map((insight) => {
                const display = getInsightTypeDisplay(insight.type);

                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-xl border ${display.color}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{display.badge}</span>
                        <div>
                          <div className="font-semibold text-base">{insight.title}</div>
                          <div className="text-sm opacity-90">{insight.description}</div>
                        </div>
                      </div>
                      <div className="text-xs opacity-75 bg-white bg-opacity-50 px-2 py-1 rounded">
                        P{insight.priority}
                      </div>
                    </div>

                    {/* Value */}
                    {insight.value && (
                      <div className="text-sm font-mono bg-white bg-opacity-50 rounded-lg px-3 py-2 mb-3">
                        {insight.value}
                      </div>
                    )}

                    {/* Action */}
                    {insight.action && (
                      <div className="text-sm font-medium flex items-start space-x-2">
                        <span>💡</span>
                        <span>{insight.action}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Clean Summary footer */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-4">
              <h5 className="font-semibold text-sm text-gray-900 mb-3">Analysis Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-600 text-lg">{shots.length}</div>
                  <div className="text-gray-600">Total Shots</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600 text-lg">
                    {gameCount > 1 ? gameCount : 1}
                  </div>
                  <div className="text-gray-600">{gameCount > 1 ? 'Games' : 'Game'}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600 text-lg">{zoneStats.length}</div>
                  <div className="text-gray-600">Active Zones</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600 text-lg">
                    {filteredInsights.filter(i => i.type === 'opportunity').length}
                  </div>
                  <div className="text-gray-600">Opportunities</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedInsightsPanel;