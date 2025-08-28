import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Team, Season, Game, AnalysisFilters, ShotWithGame, ZoneStats, GameStats } from '../types';
import { dbHelpers } from '../db';
import { 
  getFilteredShots, 
  getFilteredGames, 
  calculateZoneStats, 
  calculateGameStats, 
  getZoneDisplayName, 
  getShotColor,
  getRinkZone
} from '../lib/utils/analysis';
import { Filter, Target, TrendingUp, Calendar, Users, RotateCcw } from 'lucide-react';

const DataAnalysis: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filteredShots, setFilteredShots] = useState<ShotWithGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'chart' | 'shot_heatmap' | 'goal_heatmap'>('chart');

  const rinkRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [filters, setFilters] = useState<AnalysisFilters>({
    seasonId: '',
    teamId: '',
    dateFrom: '',
    dateTo: ''
  });

  const generateSplashZones = useCallback((shots: ShotWithGame[], type: 'shot' | 'goal') => {
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
      shots: ShotWithGame[];
      efficiency: number;
    }
    
    const zones: SplashZone[] = [];
    const radius = 30; // Base zone radius
    const processed = new Set<number>();

    relevantShots.forEach((shot, index) => {
      if (processed.has(index)) return;

      const centerX = shot.x * width;
      const centerY = shot.y * height;
      const zone: SplashZone = { centerX, centerY, shots: [shot], efficiency: 0 };

      // Find nearby shots within radius
      relevantShots.forEach((otherShot, otherIndex) => {
        if (otherIndex === index || processed.has(otherIndex)) return;

        const otherX = otherShot.x * width;
        const otherY = otherShot.y * height;
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

  useEffect(() => {
    if (!loading) {
      applyFilters();
    }
  }, [filters, loading]); // applyFilters is stable function

  // Generate heatmap/splash zones when view mode or data changes
  useEffect(() => {
    if (!canvasRef.current || viewMode === 'chart' || filteredShots.length === 0) return;

    const canvas = canvasRef.current;
    const container = rinkRef.current;
    if (!container) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(600, rect.width);
    canvas.height = Math.max(300, rect.height / 2);

    const type = viewMode === 'goal_heatmap' ? 'goal' : 'shot';
    const visualizationData = generateSplashZones(filteredShots, type);
    
    if (visualizationData && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(visualizationData, 0, 0);
      }
    }
  }, [viewMode, filteredShots, generateSplashZones]);

  const loadInitialData = async () => {
    try {
      const [allTeams, allSeasons] = await Promise.all([
        dbHelpers.getAllTeams(),
        dbHelpers.getAllSeasons()
      ]);
      
      setTeams(allTeams);
      setSeasons(allSeasons);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const [shots, games] = await Promise.all([
        getFilteredShots(filters),
        getFilteredGames(filters)
      ]);

      setFilteredShots(shots);
      setFilteredGames(games);
      setZoneStats(calculateZoneStats(shots));
      setGameStats(calculateGameStats(shots, games));
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
      dateTo: ''
    });
  };

  const getShotPosition = (shot: ShotWithGame) => {
    if (!rinkRef.current) return { left: '50%', top: '50%' };

    const left = shot.x * 100; // Convert to percentage
    const top = shot.y * 100; // Convert to percentage
    
    console.log('DataAnalysis displaying shot:', {x: shot.x, y: shot.y, result: shot.result});

    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      top: `${Math.max(0, Math.min(100, top))}%`
    };
  };


  const getInsights = () => {
    if (filteredShots.length === 0 || zoneStats.length === 0) return null;

    // Zone analysis
    const zoneStatsWithNames = zoneStats.map(zone => ({
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

  const getPeriodBreakdown = () => {
    const periodStats: Record<number, { shots: number; goals: number }> = { 1: { shots: 0, goals: 0 }, 2: { shots: 0, goals: 0 }, 3: { shots: 0, goals: 0 } };
    
    filteredShots.forEach(shot => {
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
  };

  const shotResultData = [
    { name: 'Goals', value: gameStats?.totalGoals || 0, color: '#22c55e' },
    { name: 'Saves', value: gameStats?.totalSaves || 0, color: '#3b82f6' },
    { name: 'Misses', value: gameStats?.totalMisses || 0, color: '#6b7280' },
    { name: 'Blocked', value: gameStats?.totalBlocked || 0, color: '#f97316' }
  ];

  const zoneChartData = zoneStats.map(zone => ({
    zone: getZoneDisplayName(zone.zone),
    shots: zone.shots,
    goals: zone.goals,
    percentage: zone.percentage
  }));

  if (loading && filteredShots.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <div className="text-lg text-gray-600">Loading analysis data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Data Analysis</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Season Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Season</label>
                <select
                  value={filters.seasonId || ''}
                  onChange={(e) => setFilters({ ...filters, seasonId: e.target.value || undefined })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Seasons</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <select
                  value={filters.teamId || ''}
                  onChange={(e) => setFilters({ ...filters, teamId: e.target.value || undefined })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  <Target className="w-4 h-4" />
                  <span>{filteredShots.length} shots analyzed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{filteredGames.length} games</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Total Shots</h3>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {gameStats?.totalShots || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold">Goal %</h3>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-2">
                {gameStats?.goalPercentage || 0}%
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Shots/Game</h3>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-2">
                {gameStats?.shotsPerGame || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold">Games</h3>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-2">
                {filteredGames.length}
              </div>
            </div>
          </div>

          {/* Shot Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <h2 className="text-xl font-semibold mb-2 sm:mb-0">Shot Analysis</h2>
              
              {/* Toggle Buttons */}
              <div className="flex rounded-lg border border-gray-300 p-1 bg-gray-50">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Shot Chart
                </button>
                <button
                  onClick={() => setViewMode('shot_heatmap')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'shot_heatmap'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-700 hover:text-orange-600'
                  }`}
                >
                  Shot Heatmap
                </button>
                <button
                  onClick={() => setViewMode('goal_heatmap')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'goal_heatmap'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-700 hover:text-red-600'
                  }`}
                >
                  Goal Heatmap
                </button>
              </div>
            </div>
            
            
            <div className="relative">
              {/* Rink Background */}
              <div
                ref={rinkRef}
                className="relative w-full bg-center bg-contain bg-no-repeat border border-gray-300 rounded"
                style={{
                  backgroundImage: 'url(/images/rink.png), url(/images/rink-placeholder.svg)',
                  backgroundSize: 'contain',
                  aspectRatio: '2/1',
                  minHeight: '300px'
                }}
              >
                {/* Splash Zone Canvas */}
                {(viewMode === 'shot_heatmap' || viewMode === 'goal_heatmap') && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full opacity-80 pointer-events-none"
                    style={{
                      objectFit: 'contain',
                      zIndex: 5
                    }}
                  />
                )}
                
                {/* Shot Overlays - only show in chart mode */}
                {viewMode === 'chart' && filteredShots.map((shot, index) => {
                  const position = getShotPosition(shot);
                  const color = getShotColor(shot.result);
                  
                  return (
                    <div
                      key={`${shot.id}-${index}`}
                      className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-white shadow-sm hover:scale-150 transition-transform cursor-pointer"
                      style={{
                        backgroundColor: color,
                        left: position.left,
                        top: position.top,
                        zIndex: 10
                      }}
                      title={`${shot.result.charAt(0).toUpperCase() + shot.result.slice(1)} - ${getRinkZone(shot.x, shot.y)}`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center mt-4">
                {viewMode === 'chart' && (
                  <div className="flex flex-wrap justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Goals</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Saves</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span className="text-sm">Misses</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">Blocked</span>
                    </div>
                  </div>
                )}
                
                {viewMode === 'shot_heatmap' && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Cold Zones</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm">Warm Zones</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Hot Zones</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm">Danger Zones</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Larger zones = more shots clustered</div>
                  </div>
                )}
                
                {viewMode === 'goal_heatmap' && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm">Low Efficiency (&lt;25%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">Med Efficiency (25-50%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm">High Efficiency (50%+)</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Shows goals/shots ratio in each zone</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Insights Panel */}
          {filteredShots.length > 0 && (() => {
            const insights = getInsights();
            return insights ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-red-600 font-medium">Hottest Zone</div>
                    <div className="text-gray-800">{insights.hottestZone.name}</div>
                    <div className="text-gray-600">({insights.hottestZone.shots} shots)</div>
                  </div>
                  
                  {insights.bestSuccessZone && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-green-600 font-medium">Best Success Zone</div>
                      <div className="text-gray-800">{insights.bestSuccessZone.name}</div>
                      <div className="text-gray-600">({insights.bestSuccessZone.percentage.toFixed(1)}% goals)</div>
                    </div>
                  )}
                  
                  {insights.coldestZone && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-blue-600 font-medium">Coldest Zone</div>
                      <div className="text-gray-800">{insights.coldestZone.name}</div>
                      <div className="text-gray-600">({insights.coldestZone.shots} shots)</div>
                    </div>
                  )}
                  
                  {insights.worstSuccessZone && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="text-orange-600 font-medium">Avoid Zone</div>
                      <div className="text-gray-800">{insights.worstSuccessZone.name}</div>
                      <div className="text-gray-600">(only {insights.worstSuccessZone.percentage.toFixed(1)}% success)</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shot Results Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Shot Results</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shotResultData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {shotResultData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Period Breakdown Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Period Breakdown</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPeriodBreakdown()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="shots" fill="#3b82f6" name="Shots" />
                    <Bar dataKey="goals" fill="#22c55e" name="Goals" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Shooting % by Zone</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="zone" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Zone Statistics Table */}
          {zoneStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Zone Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Zone</th>
                      <th className="px-4 py-2 text-center">Shots</th>
                      <th className="px-4 py-2 text-center">Goals</th>
                      <th className="px-4 py-2 text-center">Saves</th>
                      <th className="px-4 py-2 text-center">Misses</th>
                      <th className="px-4 py-2 text-center">Goal %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneStats
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((zone) => (
                        <tr key={zone.zone} className="border-t">
                          <td className="px-4 py-2 font-medium">{getZoneDisplayName(zone.zone)}</td>
                          <td className="px-4 py-2 text-center">{zone.shots}</td>
                          <td className="px-4 py-2 text-center text-green-600 font-medium">{zone.goals}</td>
                          <td className="px-4 py-2 text-center text-blue-600">{zone.saves}</td>
                          <td className="px-4 py-2 text-center text-gray-600">{zone.misses}</td>
                          <td className="px-4 py-2 text-center font-bold">
                            {zone.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredShots.length === 0 && !loading && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shot data found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your filters or track some games to see analytics
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataAnalysis;