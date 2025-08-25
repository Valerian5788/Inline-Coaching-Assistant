import React, { useState, useEffect, useRef } from 'react';
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

  const rinkRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<AnalysisFilters>({
    seasonId: '',
    teamId: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      applyFilters();
    }
  }, [filters, loading]);

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
            <h2 className="text-xl font-semibold mb-4">Shot Chart</h2>
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
                {/* Shot Overlays */}
                {filteredShots.map((shot, index) => {
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
              <div className="flex justify-center mt-4 space-x-4">
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
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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