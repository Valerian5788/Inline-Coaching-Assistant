import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { dbHelpers } from '../db';
import type { Game, Team } from '../types';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Play,
  Plus,
  Zap
} from 'lucide-react';

interface GameStats {
  totalGames: number;
  totalShots: number;
  totalGoals: number;
  avgShotsPerGame: number;
  bestShootingPercentage: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { currentSeason } = useAppStore();
  const [lastGame, setLastGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonStats, setSeasonStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [currentSeason]);

  const loadDashboardData = async () => {
    try {
      const [allGames, allTeams] = await Promise.all([
        dbHelpers.getAllGames(),
        dbHelpers.getAllTeams()
      ]);
      
      setTeams(allTeams);
      
      if (currentSeason) {
        // Get games from current season, sorted by date (most recent first)
        const seasonGames = allGames
          .filter(game => game.seasonId === currentSeason.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Set last game (most recent archived game)
        const lastArchivedGame = seasonGames.find(game => game.status === 'archived');
        setLastGame(lastArchivedGame || null);
        
        // Calculate season stats
        const archivedGames = seasonGames.filter(game => game.status === 'archived');
        if (archivedGames.length > 0) {
          const allShots = await Promise.all(
            archivedGames.map(game => dbHelpers.getShotsByGame(game.id))
          );
          const flatShots = allShots.flat();
          const totalShots = flatShots.length;
          const totalGoals = flatShots.filter(shot => shot.result === 'goal').length;
          
          setSeasonStats({
            totalGames: archivedGames.length,
            totalShots,
            totalGoals,
            avgShotsPerGame: totalShots / archivedGames.length,
            bestShootingPercentage: totalShots > 0 ? (totalGoals / totalShots) * 100 : 0
          });
        } else {
          setSeasonStats(null);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuickGame = async (periods: number, periodMinutes: number) => {
    if (!currentSeason || teams.length === 0) {
      alert('Please create a team and season first');
      return;
    }

    const now = new Date();
    const gameDateTime = now.toISOString();
    
    const newGame: Game = {
      id: crypto.randomUUID(),
      homeTeamId: teams[0].id,
      awayTeamName: `Opponent`,
      date: gameDateTime,
      status: 'planned',
      seasonId: currentSeason.id,
      periods,
      periodMinutes,
      hasOvertime: true,
      homeScore: 0,
      awayScore: 0
    };

    await dbHelpers.createGame(newGame);
    navigate('/games');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show welcome message if no teams or season
  if (teams.length === 0 || !currentSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Welcome to Hockey Coach!</h1>
          <p className="text-gray-600 mb-6 text-lg">
            {teams.length === 0 
              ? "Create your team to get started" 
              : "Create a season to start tracking games"}
          </p>
          <div className="space-x-4">
            {teams.length === 0 && (
              <button
                onClick={() => navigate('/teams')}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                Create Team
              </button>
            )}
            {teams.length > 0 && !currentSeason && (
              <button
                onClick={() => navigate('/seasons')}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                Create Season
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Last Game Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Last Game</h2>
          </div>
          {lastGame ? (
            <div>
              <div className="text-lg font-medium mb-2">
                {getTeamName(lastGame.homeTeamId)} vs {lastGame.awayTeamName}
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {lastGame.homeScore} - {lastGame.awayScore}
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(lastGame.date)}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No games completed yet</p>
          )}
        </div>

        {/* Season Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Season Stats</h2>
          </div>
          {seasonStats ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Games:</span>
                <span className="font-semibold">{seasonStats.totalGames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Shots/Game:</span>
                <span className="font-semibold">{seasonStats.avgShotsPerGame.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shooting %:</span>
                <span className="font-semibold text-green-600">{seasonStats.bestShootingPercentage.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Complete a game to see stats</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => createQuickGame(2, 25)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Quick Game</span>
            </button>
            <button
              onClick={() => navigate('/games')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>All Games</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;