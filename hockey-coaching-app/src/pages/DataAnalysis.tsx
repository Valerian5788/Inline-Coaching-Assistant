import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Team, Season, Game, AnalysisFilters, ShotWithGame, ComparisonMode, AnalysisState } from '../types';
import { dbHelpers } from '../db';
import {
  getFilteredShots,
  getFilteredGames,
  getFilteredNormalizedShots,
  getFilteredGoalsAgainst,
  calculateGameStats
} from '../lib/utils/analysis';
import {
  generateSmartInsights,
  type NormalizedShotWithGame,
  type NormalizedGoalAgainst
} from '../utils/shotNormalization';
import {
  applyEnhancedFilters,
  prepareMultiGameComparison,
  aggregateMultipleGames,
  generateMultiGameInsights,
  calculateEnhancedZoneStats,
  type GameComparisonData,
  type MultiGameInsight
} from '../lib/utils/enhancedAnalysis';
import { exportGameReport, prepareGameReportData } from '../utils/pdfExport';

// New enhanced components
import GameSelector from '../components/analysis/GameSelector';
import TimeBasedFilters from '../components/analysis/TimeBasedFilters';
import AdvancedFilters from '../components/analysis/AdvancedFilters';
import MultiRinkVisualization from '../components/analysis/MultiRinkVisualization';
import InteractiveZoneAnalytics from '../components/analysis/InteractiveZoneAnalytics';
import EnhancedInsightsPanel from '../components/analysis/EnhancedInsightsPanel';

import { Filter, Target, TrendingUp, Calendar, Users, Download, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const DataAnalysis: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filteredShots, setFilteredShots] = useState<ShotWithGame[]>([]);
  const [normalizedShots, setNormalizedShots] = useState<NormalizedShotWithGame[]>([]);
  const [enhancedFilteredShots, setEnhancedFilteredShots] = useState<NormalizedShotWithGame[]>([]);
  const [normalizedGoalsAgainst, setNormalizedGoalsAgainst] = useState<NormalizedGoalAgainst[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'rink' | 'analytics'>('rink');

  // Enhanced analysis state
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    selectedGameIds: [],
    comparisonMode: 'overlay',
    maxGamesForComparison: 10
  });

  // Enhanced filter states
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<{ from?: number; to?: number }>({});
  const [selectedShotResults, setSelectedShotResults] = useState<ShotWithGame['result'][]>([]);
  const [scoreSituation, setScoreSituation] = useState<'winning' | 'losing' | 'tied' | 'all'>('all');

  const rinkRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [filters, setFilters] = useState<AnalysisFilters>({
    seasonId: '',
    teamId: '',
    dateFrom: '',
    dateTo: '',
    gameIds: [],
    periods: [],
    shotResults: [],
    scoreSituation: 'all',
    timeFrom: undefined,
    timeTo: undefined
  });

  // Enhanced filtering effect
  useEffect(() => {
    if (normalizedShots.length > 0) {
      const enhancedFiltered = applyEnhancedFilters(normalizedShots, filteredGames, filters);
      setEnhancedFilteredShots(enhancedFiltered);
    } else {
      setEnhancedFilteredShots([]);
    }
  }, [normalizedShots, filteredGames, filters]);

  // Enhanced memoized calculations
  const memoizedZoneStats = useMemo(() => {
    return calculateEnhancedZoneStats(enhancedFilteredShots);
  }, [enhancedFilteredShots]);

  const memoizedGameStats = useMemo(() => {
    return calculateGameStats(filteredShots, filteredGames);
  }, [filteredShots, filteredGames]);

  const memoizedSmartInsights = useMemo(() => {
    return generateSmartInsights(enhancedFilteredShots);
  }, [enhancedFilteredShots]);

  // Multi-game comparison data
  const gameComparisonData = useMemo((): GameComparisonData[] => {
    if (analysisState.selectedGameIds.length === 0) return [];
    return prepareMultiGameComparison(
      analysisState.selectedGameIds,
      enhancedFilteredShots,
      filteredGames
    );
  }, [analysisState.selectedGameIds, enhancedFilteredShots, filteredGames]);

  const aggregatedShots = useMemo(() => {
    if (analysisState.comparisonMode === 'aggregate') {
      return aggregateMultipleGames(gameComparisonData);
    }
    return enhancedFilteredShots;
  }, [analysisState.comparisonMode, gameComparisonData, enhancedFilteredShots]);

  // Multi-game insights
  const multiGameInsights = useMemo((): MultiGameInsight[] => {
    if (gameComparisonData.length < 2) return [];
    return generateMultiGameInsights(gameComparisonData);
  }, [gameComparisonData]);

  const memoizedPeriodBreakdown = useMemo(() => {
    const periodStats: Record<number, { shots: number; goals: number }> = { 1: { shots: 0, goals: 0 }, 2: { shots: 0, goals: 0 }, 3: { shots: 0, goals: 0 } };
    
    normalizedShots.forEach(shot => {
      if (periodStats[shot.period]) {
        periodStats[shot.period].shots++;
        if (shot.result === 'goal') {
          periodStats[shot.period].goals++;
        }
      }
    });

    return Object.entries(periodStats).map(([period, stats]) => ({
      period: `Period ${period}`,
      shots: stats.shots,
      goals: stats.goals
    }));
  }, [normalizedShots]);

  const memoizedShotResultData = useMemo(() => [
    { name: 'Goals', value: memoizedGameStats?.totalGoals || 0, color: '#22c55e' },
    { name: 'Saves', value: memoizedGameStats?.totalSaves || 0, color: '#3b82f6' },
    { name: 'Misses', value: memoizedGameStats?.totalMisses || 0, color: '#6b7280' },
    { name: 'Blocked', value: memoizedGameStats?.totalBlocked || 0, color: '#f97316' }
  ], [memoizedGameStats]);

  const memoizedZoneChartData = useMemo(() => {
    return memoizedZoneStats.map(zone => ({
      zone: getZoneDisplayName(zone.zone),
      shots: zone.shots,
      goals: zone.goals,
      percentage: zone.percentage
    }));
  }, [memoizedZoneStats]);

  const generateSplashZones = useCallback((shots: NormalizedShotWithGame[], type: 'shot' | 'goal') => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Filter shots based on type
    const relevantShots = type === 'goal' 
      ? shots.filter(shot => shot.result === 'goal')
      : shots;

    if (relevantShots.length === 0) {
      return ctx.getImageData(0, 0, width, height);
    }

    // Group shots by proximity to create splash zones
    interface SplashZone {
      centerX: number;
      centerY: number;
      shots: NormalizedShotWithGame[];
      efficiency: number;
    }
    
    const zones: SplashZone[] = [];
    const radius = 30; // Base zone radius
    const processed = new Set<number>();

    relevantShots.forEach((shot, index) => {
      if (processed.has(index)) return;

      const centerX = shot.normalizedX * width;
      const centerY = shot.normalizedY * height;
      const zone: SplashZone = { centerX, centerY, shots: [shot], efficiency: 0 };

      // Find nearby shots within radius
      relevantShots.forEach((otherShot, otherIndex) => {
        if (otherIndex === index || processed.has(otherIndex)) return;

        const otherX = otherShot.normalizedX * width;
        const otherY = otherShot.normalizedY * height;
        const distance = Math.sqrt(Math.pow(centerX - otherX, 2) + Math.pow(centerY - otherY, 2));

        if (distance <= radius) {
          zone.shots.push(otherShot);
          processed.add(otherIndex);
        }
      });

      // Calculate zone efficiency (goals/shots ratio)
      const goals = zone.shots.filter(s => s.result === 'goal').length;
      zone.efficiency = zone.shots.length > 0 ? goals / zone.shots.length : 0;
      
      zones.push(zone);
      processed.add(index);
    });

    // Sort zones by shot count for better rendering
    zones.sort((a, b) => b.shots.length - a.shots.length);

    // Render splash zones
    zones.forEach(zone => {
      const intensity = Math.min(zone.shots.length / 5, 1); // Normalize to max 5 shots
      const zoneRadius = radius + (zone.shots.length * 5); // Larger zones for more shots

      // Create radial gradient for splash effect
      const gradient = ctx.createRadialGradient(
        zone.centerX, zone.centerY, 0,
        zone.centerX, zone.centerY, zoneRadius
      );

      // Color based on type and intensity
      let r, g, b;
      if (type === 'goal') {
        // Goal zones: efficiency-based coloring
        if (zone.efficiency >= 0.5) {
          r = 34; g = 197; b = 94; // Green for high efficiency
        } else if (zone.efficiency >= 0.25) {
          r = 251; g = 191; b = 36; // Yellow for medium efficiency
        } else {
          r = 239; g = 68; b = 68; // Red for low efficiency
        }
      } else {
        // Shot zones: heat-based coloring (blue to red)
        if (intensity < 0.3) {
          r = 59; g = 130; b = 246; // Blue - cold zones
        } else if (intensity < 0.6) {
          r = 34; g = 197; b = 94; // Green - warm zones
        } else if (intensity < 0.8) {
          r = 251; g = 191; b = 36; // Yellow - hot zones
        } else {
          r = 239; g = 68; b = 68; // Red - danger zones
        }
      }

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.8 * intensity})`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.4 * intensity})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(zone.centerX, zone.centerY, zoneRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Add zone info text for larger zones
      if (zone.shots.length >= 3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        
        if (type === 'goal') {
          const goals = zone.shots.filter(s => s.result === 'goal').length;
          ctx.fillText(
            `${goals}/${zone.shots.length}`, 
            zone.centerX, 
            zone.centerY - 5
          );
          ctx.fillText(
            `${(zone.efficiency * 100).toFixed(0)}%`, 
            zone.centerX, 
            zone.centerY + 10
          );
        } else {
          ctx.fillText(
            `${zone.shots.length} shots`, 
            zone.centerX, 
            zone.centerY - 5
          );
          ctx.fillText(
            `${(zone.efficiency * 100).toFixed(0)}%`, 
            zone.centerX, 
            zone.centerY + 10
          );
        }
      }
    });

    return ctx.getImageData(0, 0, width, height);
  }, []);


  useEffect(() => {
    loadInitialData();
  }, []);

  // Initial data fetch after component loads
  useEffect(() => {
    if (!loading) {
      applyFilters();
    }
  }, []); // Run once after initial load

  // Enhanced filter effect - apply both base and enhanced filters
  useEffect(() => {
    applyFilters();
  }, [filters]);

  // Apply enhanced filters when base data or enhanced filter states change
  useEffect(() => {
    if (normalizedShots.length === 0) {
      setEnhancedFilteredShots([]);
      return;
    }

    const enhancedFilters: AnalysisFilters = {
      ...filters,
      periods: selectedPeriods.length > 0 ? selectedPeriods : undefined,
      shotResults: selectedShotResults.length > 0 ? selectedShotResults : undefined,
      scoreSituation,
      timeFrom: timeRange.from,
      timeTo: timeRange.to
    };

    const enhanced = applyEnhancedFilters(normalizedShots, filteredGames, enhancedFilters);
    setEnhancedFilteredShots(enhanced);
  }, [
    normalizedShots,
    filteredGames,
    selectedPeriods,
    selectedShotResults,
    scoreSituation,
    timeRange,
    filters
  ]);

  // Generate heatmap/splash zones when view mode or data changes
  useEffect(() => {
    if (!canvasRef.current || viewMode === 'chart' || normalizedShots.length === 0) return;

    const canvas = canvasRef.current;
    const container = rinkRef.current;
    if (!container) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(600, rect.width);
    canvas.height = Math.max(300, rect.height / 2);

    const type = viewMode === 'goal_heatmap' ? 'goal' : 'shot';
    const visualizationData = generateSplashZones(normalizedShots, type);
    
    if (visualizationData && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(visualizationData, 0, 0);
      }
    }
  }, [viewMode, normalizedShots, generateSplashZones]);

  const loadInitialData = async () => {
    try {
      const [allTeams, allSeasons] = await Promise.all([
        dbHelpers.getAllTeams().catch(() => []),
        dbHelpers.getAllSeasons().catch(() => [])
      ]);

      setTeams(allTeams);
      setSeasons(allSeasons);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Set empty arrays as fallback
      setTeams([]);
      setSeasons([]);
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const [shots, games, normalizedShotsData, goalsAgainstData] = await Promise.all([
        getFilteredShots(filters),
        getFilteredGames(filters),
        getFilteredNormalizedShots(filters),
        getFilteredGoalsAgainst(filters)
      ]);

      setFilteredShots(shots);
      setFilteredGames(games);
      setNormalizedShots(normalizedShotsData);
      setNormalizedGoalsAgainst(goalsAgainstData);
      // Note: zoneStats, gameStats, and smartInsights are now computed via useMemo
    } catch (error) {
      console.error('Failed to apply filters:', error);
    }
    setLoading(false);
  };

  const clearFilters = () => {
    setFilters({
      seasonId: '',
      teamId: '',
      dateFrom: '',
      dateTo: '',
      gameIds: [],
      periods: [],
      shotResults: [],
      scoreSituation: 'all',
      timeFrom: undefined,
      timeTo: undefined
    });
    setSelectedPeriods([]);
    setSelectedShotResults([]);
    setScoreSituation('all');
    setTimeRange({});
    setAnalysisState({
      selectedGameIds: [],
      comparisonMode: 'overlay',
      maxGamesForComparison: 10
    });
  };

  const toggleFilters = () => {
    setIsFiltersExpanded(!isFiltersExpanded);
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.seasonId) count++;
    if (filters.teamId) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (selectedPeriods.length > 0) count++;
    if (selectedShotResults.length > 0) count++;
    if (scoreSituation !== 'all') count++;
    if (timeRange.from !== undefined || timeRange.to !== undefined) count++;
    if (analysisState.selectedGameIds.length > 0) count++;
    return count;
  }, [filters, selectedPeriods, selectedShotResults, scoreSituation, timeRange, analysisState.selectedGameIds]);

  // Game selection handlers
  const handleGameSelectionChange = (gameIds: string[]) => {
    setAnalysisState(prev => ({ ...prev, selectedGameIds: gameIds }));
    setFilters(prev => ({ ...prev, gameIds }));
  };

  const handleComparisonModeChange = (mode: ComparisonMode) => {
    setAnalysisState(prev => ({ ...prev, comparisonMode: mode }));
  };

  // Zone interaction handler
  const handleZoneClick = (zone: string) => {
    setSelectedZone(selectedZone === zone ? undefined : zone);
  };

  const handleExportPDF = async () => {
    if (!memoizedGameStats || filteredShots.length === 0) {
      alert('No data to export. Please track some games first.');
      return;
    }

    try {
      // Find the team and season for the report
      const team = teams.find(t => t.id === filters.teamId) || teams[0];
      const season = seasons.find(s => s.id === filters.seasonId) || seasons[0];

      if (!team || !season) {
        alert('Team and season data required for export.');
        return;
      }

      // Create a sample game for the analysis report
      const analysisGame: Game = {
        id: 'analysis-report',
        homeTeamId: team.id,
        awayTeamName: 'Multiple Opponents',
        date: new Date().toISOString(),
        status: 'archived' as const,
        seasonId: season.id,
        periods: 3,
        periodMinutes: 20,
        hasOvertime: false,
        homeScore: memoizedGameStats.totalGoals,
        awayScore: 0, // Analysis doesn't track opponent goals
        userId: team.userId
      };

      // Generate insights from smart insights or fallback
      const insights = memoizedSmartInsights.length > 0
        ? memoizedSmartInsights.map(insight => insight.text + (insight.value ? ` (${insight.value})` : ''))
        : [];

      // Add zone-based insights if available
      if (memoizedZoneStats.length > 0) {
        const bestZone = memoizedZoneStats.reduce((max, zone) => zone.percentage > max.percentage ? zone : max);
        insights.push(`Best shooting zone: ${getZoneDisplayName(bestZone.zone)} with ${bestZone.percentage.toFixed(1)}% success rate`);
      }

      const reportData = prepareGameReportData(
        analysisGame,
        team,
        season,
        filteredShots,
        insights
      );

      await exportGameReport(reportData);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const getShotPosition = (shot: NormalizedShotWithGame) => {
    if (!rinkRef.current) return { left: '50%', top: '50%' };

    const left = shot.normalizedX * 100; // Convert to percentage
    const top = shot.normalizedY * 100; // Convert to percentage
    
    console.log('DataAnalysis displaying normalized shot:', {
      original: { x: shot.x, y: shot.y }, 
      normalized: { x: shot.normalizedX, y: shot.normalizedY },
      result: shot.result,
      period: shot.period
    });

    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      top: `${Math.max(0, Math.min(100, top))}%`
    };
  };


  const getInsights = () => {
    if (normalizedShots.length === 0 || memoizedZoneStats.length === 0) return null;

    // Zone analysis
    const zoneStatsWithNames = memoizedZoneStats.map(zone => ({
      ...zone,
      name: getZoneDisplayName(zone.zone)
    }));

    if (zoneStatsWithNames.length === 0) return null;

    const hottestZone = zoneStatsWithNames.reduce((max, zone) => 
      zone.shots > max.shots ? zone : max
    );

    const zonesWithShots = zoneStatsWithNames.filter(zone => zone.shots > 0);
    const bestSuccessZone = zonesWithShots.length > 0 
      ? zonesWithShots.reduce((max, zone) => 
          zone.percentage > max.percentage ? zone : max
        )
      : null;

    const coldestZone = zonesWithShots.length > 0
      ? zonesWithShots.reduce((min, zone) => 
          zone.shots < min.shots ? zone : min
        )
      : null;

    const zonesWithMeaningfulSample = zoneStatsWithNames.filter(zone => zone.shots > 2);
    const worstSuccessZone = zonesWithMeaningfulSample.length > 0
      ? zonesWithMeaningfulSample.reduce((min, zone) => 
          zone.percentage < min.percentage ? zone : min
        )
      : null;

    return {
      hottestZone,
      bestSuccessZone,
      coldestZone,
      worstSuccessZone
    };
  };

  // Removed getPeriodBreakdown - now using memoizedPeriodBreakdown

  // Removed shotResultData and zoneChartData - now using memoized versions

  if (loading && normalizedShots.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <div className="text-lg text-gray-600">Loading analysis data...</div>
        </div>
      </div>
    );
  }


  // Enhanced Data Analysis with Better Visual Design
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Analysis</h1>
              <p className="text-lg text-gray-600">Advanced multi-game analytics and insights</p>
            </div>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area with Better Spacing */}
      <div className="container mx-auto px-6 py-8">
        {/* Collapsible Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={toggleFilters}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFilters();
              }
            }}
            aria-expanded={isFiltersExpanded}
            aria-controls="filters-content"
          >
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-600" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-lg">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="text-sm text-blue-600 font-medium">
                  ({activeFilterCount} active)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isFiltersExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600 transition-transform duration-200" />
              )}
            </div>
          </div>

          <div
            id="filters-content"
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              isFiltersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Game Selector */}
                <div>
                  <GameSelector
                    games={filteredGames}
                    selectedGameIds={analysisState.selectedGameIds}
                    onSelectionChange={(gameIds) => setAnalysisState(prev => ({
                      ...prev,
                      selectedGameIds: gameIds
                    }))}
                    comparisonMode={analysisState.comparisonMode}
                    onComparisonModeChange={(mode) => setAnalysisState(prev => ({
                      ...prev,
                      comparisonMode: mode
                    }))}
                    maxSelections={10}
                  />
                </div>

                {/* Advanced Filters */}
                <div>
                  <AdvancedFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    gameCount={filteredGames.length}
                  />
                </div>

                {/* Time-Based Filters */}
                <div>
                  <TimeBasedFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    totalPeriods={3}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats Cards - Full Width */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Shots</p>
                <p className="text-2xl font-bold text-gray-900">{enhancedFilteredShots.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Goal %</p>
                <p className="text-2xl font-bold text-gray-900">
                  {enhancedFilteredShots.length > 0
                    ? ((enhancedFilteredShots.filter(s => s.result === 'goal').length / enhancedFilteredShots.length) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Games</p>
                <p className="text-2xl font-bold text-gray-900">{filteredGames.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Zones</p>
                <p className="text-2xl font-bold text-gray-900">{memoizedZoneStats.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Section - Better Use of Space */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Zone Analytics - Expanded Space */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <InteractiveZoneAnalytics
                zoneStats={memoizedZoneStats}
                onZoneClick={(zone) => {
                  console.log('Zone clicked:', zone);
                  // Future enhancement: filter by zone
                }}
                selectedZone={undefined}
                showComparison={false}
              />
            </div>
          </div>

          {/* Insights Panel - Right Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <EnhancedInsightsPanel
                shots={enhancedFilteredShots}
                zoneStats={memoizedZoneStats}
                multiGameInsights={multiGameInsights}
                gameCount={analysisState.selectedGameIds.length || filteredGames.length}
                periodBreakdown={memoizedPeriodBreakdown}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* Multi-Game Visualization Section */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 lg:mb-0">Multi-Game Visualization</h2>

              {/* Cleaner View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('rink')}
                  className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                    activeTab === 'rink'
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Rink View</span>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                    activeTab === 'analytics'
                      ? 'bg-white shadow-sm text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Charts</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="min-h-96">
              {activeTab === 'rink' && (
                <MultiRinkVisualization
                  gameComparisons={gameComparisonData}
                  comparisonMode={analysisState.comparisonMode}
                  aggregatedShots={aggregatedShots}
                  className="w-full"
                />
              )}

              {activeTab === 'analytics' && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Charts</h3>
                  <p className="text-gray-600">Enhanced analytics and comparison charts coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAnalysis;
