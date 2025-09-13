import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../db';
import type { Game, Team } from '../types';
import { 
  Calendar, 
  Users, 
  Play,
  Zap,
  Clock,
  Target,
  MapPin,
  Trophy,
  Activity,
  CalendarDays,
  BarChart3
} from 'lucide-react';

interface GameStats {
  totalGames: number;
  totalShots: number;
  totalGoals: number;
  avgShotsPerGame: number;
  bestShootingPercentage: number;
  wins: number;
  losses: number;
  ties: number;
  gamesThisWeek: number;
  recentForm: string[];
}

interface RecentActivity {
  id: string;
  type: 'game' | 'drill' | 'player';
  title: string;
  description: string;
  timestamp: string;
  action?: () => void;
}

interface UpcomingGame {
  id: string;
  opponent: string;
  date: Date;
  time: string;
  location?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { currentSeason } = useAppStore();
  const { currentUser } = useAuth();
  const [lastGame, setLastGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonStats, setSeasonStats] = useState<GameStats | null>(null);
  const [upcomingGame, setUpcomingGame] = useState<UpcomingGame | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [currentSeason]);

  const loadDashboardData = async () => {
    try {
      const [allGames, allTeams] = await Promise.all([
        dbHelpers.getAllGames().catch(() => []),
        dbHelpers.getAllTeams().catch(() => [])
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
        
        // Find upcoming game (next planned game)
        const upcomingGames = seasonGames
          .filter(game => game.status === 'planned' && new Date(game.date) >= new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (upcomingGames.length > 0) {
          const nextGame = upcomingGames[0];
          const gameDate = new Date(nextGame.date);
          setUpcomingGame({
            id: nextGame.id,
            opponent: nextGame.awayTeamName,
            date: gameDate,
            time: gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            location: 'Home Arena' // Could be enhanced with location field
          });
        } else {
          setUpcomingGame(null);
        }

        // Calculate season stats
        const archivedGames = seasonGames.filter(game => game.status === 'archived');
        if (archivedGames.length > 0) {
          const allShots = await Promise.all(
            archivedGames.map(game => dbHelpers.getShotsByGame(game.id).catch(() => []))
          );
          const flatShots = allShots.flat();
          const totalShots = flatShots.length;
          const totalGoals = flatShots.filter(shot => shot.result === 'goal').length;

          // Calculate wins/losses/ties
          let wins = 0, losses = 0, ties = 0;
          archivedGames.forEach(game => {
            if ((game.homeScore ?? 0) > (game.awayScore ?? 0)) wins++;
            else if ((game.homeScore ?? 0) < (game.awayScore ?? 0)) losses++;
            else ties++;
          });

          // Games this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const gamesThisWeek = archivedGames.filter(game => 
            new Date(game.date) >= weekStart
          ).length;

          // Recent form (last 5 games)
          const recentGames = archivedGames
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
          const recentForm = recentGames.map(game => 
            (game.homeScore ?? 0) > (game.awayScore ?? 0) ? 'W' :
            (game.homeScore ?? 0) < (game.awayScore ?? 0) ? 'L' : 'T'
          );
          
          setSeasonStats({
            totalGames: archivedGames.length,
            totalShots,
            totalGoals,
            avgShotsPerGame: totalShots / archivedGames.length,
            bestShootingPercentage: totalShots > 0 ? (totalGoals / totalShots) * 100 : 0,
            wins,
            losses,
            ties,
            gamesThisWeek,
            recentForm
          });
        } else {
          setSeasonStats(null);
        }
        
        // Build recent activity
        const activities: RecentActivity[] = [];
        
        // Add recent games
        const recentGames = archivedGames
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        
        recentGames.forEach(game => {
          const result = (game.homeScore ?? 0) > (game.awayScore ?? 0) ? 'Won' :
                        (game.homeScore ?? 0) < (game.awayScore ?? 0) ? 'Lost' : 'Tied';
          activities.push({
            id: game.id,
            type: 'game',
            title: `${result} vs ${game.awayTeamName}`,
            description: `${game.homeScore ?? 0}-${game.awayScore ?? 0} • ${formatDate(game.date)}`,
            timestamp: game.date,
            action: () => navigate('/games')
          });
        });

        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuickGame = async () => {
    if (!currentSeason || teams.length === 0 || !currentUser) {
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
      periods: 2,
      periodMinutes: 25,
      hasOvertime: true,
      homeScore: 0,
      awayScore: 0,
      userId: currentUser.uid
    };

    await dbHelpers.createGame(newGame);
    navigate('/games');
  };

  const startQuickPractice = async () => {
    if (!currentSeason || teams.length === 0 || !currentUser) {
      alert('Please create a team and season first');
      return;
    }

    const now = new Date();
    const gameDateTime = now.toISOString();

    const practiceGame: Game = {
      id: crypto.randomUUID(),
      homeTeamId: teams[0].id,
      awayTeamName: `Practice Session`,
      date: gameDateTime,
      status: 'planned',
      seasonId: currentSeason.id,
      periods: 1,
      periodMinutes: 60,
      hasOvertime: false,
      homeScore: 0,
      awayScore: 0,
      userId: currentUser.uid
    };

    await dbHelpers.createGame(practiceGame);
    navigate('/games');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatGreeting = () => {
    const hour = currentTime.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    return `${greeting}, Coach!`;
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
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
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          {formatGreeting()}
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          {formatCurrentDate()}
        </p>
        {teams.length > 0 && (
          <p className="text-blue-600 font-medium">
            Coaching {teams[0].name}
            {currentSeason && ` • ${currentSeason.name}`}
          </p>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <button
          onClick={createQuickGame}
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 sm:py-6 px-3 sm:px-4 rounded-lg flex flex-col items-center space-y-2 sm:space-y-3 transition-all transform active:scale-95 min-h-[100px] sm:min-h-[120px] touch-action-manipulation"
        >
          <Play className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-lg text-center leading-tight">Start Game</span>
        </button>

        <button
          onClick={startQuickPractice}
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-4 sm:py-6 px-3 sm:px-4 rounded-lg flex flex-col items-center space-y-2 sm:space-y-3 transition-all transform active:scale-95 min-h-[100px] sm:min-h-[120px] touch-action-manipulation"
        >
          <Target className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-lg text-center leading-tight">Quick Practice</span>
        </button>

        <button
          onClick={() => navigate('/games')}
          className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-bold py-4 sm:py-6 px-3 sm:px-4 rounded-lg flex flex-col items-center space-y-2 sm:space-y-3 transition-all transform active:scale-95 min-h-[100px] sm:min-h-[120px] touch-action-manipulation"
        >
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-lg text-center leading-tight">View Schedule</span>
        </button>

        <button
          onClick={() => navigate('/training')}
          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-4 sm:py-6 px-3 sm:px-4 rounded-lg flex flex-col items-center space-y-2 sm:space-y-3 transition-all transform active:scale-95 min-h-[100px] sm:min-h-[120px] touch-action-manipulation"
        >
          <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-lg text-center leading-tight">Design Drill</span>
        </button>
      </div>
      {/* Today's Overview */}
      {(upcomingGame && isToday(upcomingGame.date.toISOString())) || (lastGame && isToday(lastGame.date)) ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm sm:text-xl font-semibold">Today's Overview</h2>
          </div>
          
          {upcomingGame && isToday(upcomingGame.date.toISOString()) && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium text-blue-800">Upcoming Game</h3>
              </div>
              <p className="text-lg font-semibold">{upcomingGame.time} vs {upcomingGame.opponent}</p>
              {upcomingGame.location && (
                <div className="flex items-center space-x-1 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{upcomingGame.location}</span>
                </div>
              )}
            </div>
          )}
          
          {lastGame && isToday(lastGame.date) && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-green-800">Game Completed</h3>
              </div>
              <p className="text-lg font-semibold">
                {getTeamName(lastGame.homeTeamId)} {lastGame.homeScore} - {lastGame.awayScore} {lastGame.awayTeamName}
              </p>
            </div>
          )}
        </div>
      ) : null}
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {/* Quick Stats Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <h2 className="text-sm sm:text-xl font-semibold">This Week</h2>
          </div>
          {seasonStats ? (
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                {seasonStats.gamesThisWeek}
              </div>
              <div className="text-sm text-gray-600">
                Games Played
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center">No games this week</p>
          )}
        </div>

        {/* Season Record */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <h2 className="text-sm sm:text-xl font-semibold">Season Record</h2>
          </div>
          {seasonStats && seasonStats.totalGames > 0 ? (
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">
                {seasonStats.wins}-{seasonStats.losses}-{seasonStats.ties}
              </div>
              <div className="text-sm text-gray-600">
                W-L-T Record
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center">No games completed</p>
          )}
        </div>

        {/* Team Shooting % */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h2 className="text-sm sm:text-xl font-semibold">Shooting %</h2>
          </div>
          {seasonStats && seasonStats.totalShots > 0 ? (
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                {seasonStats.bestShootingPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                Season Average
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center">No shots recorded</p>
          )}
        </div>
        
        {/* Recent Form */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <h2 className="text-sm sm:text-xl font-semibold">Recent Form</h2>
          </div>
          {seasonStats && seasonStats.recentForm.length > 0 ? (
            <div className="flex justify-center space-x-1">
              {seasonStats.recentForm.map((result, index) => (
                <span
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    result === 'W' ? 'bg-green-500' :
                    result === 'L' ? 'bg-red-500' : 'bg-gray-500'
                  }`}
                >
                  {result}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center">No recent games</p>
          )}
        </div>
      </div>
      
      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-sm sm:text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div 
                key={activity.id} 
                className={`flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 ${
                  activity.action ? 'cursor-pointer' : ''
                }`}
                onClick={activity.action}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'game' ? 'bg-blue-100' :
                  activity.type === 'drill' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'game' ? (
                    <Play className={`w-5 h-5 ${
                      activity.type === 'game' ? 'text-blue-600' :
                      activity.type === 'drill' ? 'text-green-600' : 'text-purple-600'
                    }`} />
                  ) : activity.type === 'drill' ? (
                    <Zap className="w-5 h-5 text-green-600" />
                  ) : (
                    <Users className="w-5 h-5 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Motivational Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-gray-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Coaching Tip</h3>
          <p className="text-gray-700 italic">
            "Track shots by zone to identify offensive patterns and improve your team's scoring opportunities."
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;