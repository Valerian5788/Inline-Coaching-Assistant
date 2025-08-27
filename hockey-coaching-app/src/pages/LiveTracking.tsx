import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { 
  Play, 
  Pause, 
  Square,
  SkipForward,
  Plus,
  Minus,
  Target,
  Zap,
  BarChart3,
  Clock,
  Home,
  Timer,
  PauseCircle,
  CheckCircle
} from 'lucide-react';
import { dbHelpers } from '../db';

const LiveTracking: React.FC = () => {
  const navigate = useNavigate();
  const [timeInput, setTimeInput] = useState('');
  const [isTimeInputOpen, setIsTimeInputOpen] = useState(false);
  
  const { 
    currentGame, 
    isTracking, 
    isPaused, 
    gameTime,
    startTracking, 
    pauseTracking, 
    resumeTracking,
    adjustTime,
    setGameTime,
    startPeriod,
    endPeriod,
    endGame,
    addHomeGoal,
    addAwayGoal,
    useTimeout
  } = useGameStore();

  useEffect(() => {
    // If no current game, redirect to games page
    if (!currentGame) {
      navigate('/games');
    }
  }, [currentGame, navigate]);


  if (!currentGame) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentPeriodTime = () => {
    const periodLength = currentGame.periodMinutes * 60;
    const currentPeriod = currentGame.currentPeriod || 1;
    const periodStartTime = (currentPeriod - 1) * periodLength;
    const periodElapsed = gameTime - periodStartTime;
    const periodRemaining = Math.max(0, periodLength - periodElapsed);
    
    return {
      elapsed: periodElapsed,
      remaining: periodRemaining,
      total: periodLength
    };
  };

  const periodTime = getCurrentPeriodTime();
  const isPeriodComplete = periodTime.remaining === 0;

  const handlePlayPause = () => {
    if (isTracking && !isPaused) {
      pauseTracking();
    } else if (isTracking && isPaused) {
      resumeTracking();
    } else {
      startTracking();
    }
  };

  const handleSetTime = () => {
    const [mins, secs] = timeInput.split(':').map(Number);
    if (!isNaN(mins) && !isNaN(secs)) {
      const totalSeconds = mins * 60 + secs;
      setGameTime(totalSeconds);
      setTimeInput('');
      setIsTimeInputOpen(false);
    }
  };

  const handleNextPeriod = async () => {
    if (!currentGame.currentPeriod) return;
    
    await endPeriod();
    
    const nextPeriod = currentGame.currentPeriod + 1;
    if (nextPeriod <= currentGame.periods) {
      await startPeriod(nextPeriod);
    } else if (currentGame.hasOvertime && currentGame.homeScore === currentGame.awayScore) {
      // Start overtime
      await startPeriod(nextPeriod);
    }
  };

  const handleEndGame = async () => {
    if (confirm('Are you sure you want to end the game?')) {
      await endGame();
      navigate('/games');
    }
  };

  const handleHomeGoal = async () => {
    await addHomeGoal();
  };

  const handleAwayGoal = async () => {
    await addAwayGoal();
  };

  const getTeamName = async (teamId: string) => {
    const team = await dbHelpers.getTeamById(teamId);
    return team ? team.name : 'Unknown Team';
  };

  const [homeTeamName, setHomeTeamName] = useState('Home Team');

  useEffect(() => {
    if (currentGame.homeTeamId) {
      getTeamName(currentGame.homeTeamId).then(setHomeTeamName);
    }
  }, [currentGame.homeTeamId]);


  const handleTimeout = async () => {
    if (!currentGame || currentGame.timeoutUsed) return;
    await useTimeout();
  };


  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => navigate('/games')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <Home className="w-5 h-5" />
            <span>Back to Games</span>
          </button>
          <div className="text-sm text-gray-500">
            Period {currentGame.currentPeriod || 1} of {currentGame.periods}
          </div>
        </div>
        
        {/* Team Names */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {homeTeamName} vs {currentGame.awayTeamName}
          </h1>
        </div>
      </div>

      {/* Score Display */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Home Team Score */}
          <div className="text-center">
            <div className="text-lg font-medium text-gray-600 mb-2">{homeTeamName}</div>
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {currentGame.homeScore || 0}
            </div>
            <button
              onClick={handleHomeGoal}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Goal</span>
            </button>
          </div>

          {/* Time Display */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-500 mb-2">Time Remaining</div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {formatTime(periodTime.remaining)}
            </div>
            <div className="text-sm text-gray-500">
              Game Time: {formatTime(gameTime)}
            </div>
            {isPeriodComplete && (
              <div className="text-red-600 font-semibold mt-2">
                Period Complete!
              </div>
            )}
          </div>

          {/* Away Team Score */}
          <div className="text-center">
            <div className="text-lg font-medium text-gray-600 mb-2">{currentGame.awayTeamName}</div>
            <div className="text-6xl font-bold text-red-600 mb-2">
              {currentGame.awayScore || 0}
            </div>
            <button
              onClick={handleAwayGoal}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Goal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Time Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Time Controls</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className={`h-16 rounded-lg font-bold text-white flex items-center justify-center space-x-2 ${
              isTracking && !isPaused 
                ? 'bg-orange-500 hover:bg-orange-700' 
                : 'bg-green-500 hover:bg-green-700'
            }`}
          >
            {isTracking && !isPaused ? (
              <>
                <Pause className="w-6 h-6" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Timeout Button */}
          <button
            onClick={handleTimeout}
            disabled={currentGame?.timeoutUsed}
            className={`h-16 rounded-lg font-bold text-white flex items-center justify-center space-x-2 ${
              currentGame?.timeoutUsed
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-yellow-500 hover:bg-yellow-600'
            }`}
          >
            {currentGame?.timeoutUsed ? (
              <>
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm">Used ✓</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-6 h-6" />
                <span>Timeout</span>
              </>
            )}
          </button>

          {/* Time Adjustments */}
          <button
            onClick={() => adjustTime(-10)}
            className="h-16 bg-gray-500 hover:bg-gray-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2"
          >
            <Minus className="w-5 h-5" />
            <span>-10s</span>
          </button>

          <button
            onClick={() => adjustTime(10)}
            className="h-16 bg-gray-500 hover:bg-gray-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>+10s</span>
          </button>

          <button
            onClick={() => setIsTimeInputOpen(true)}
            className="h-16 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2"
          >
            <Timer className="w-5 h-5" />
            <span>Set Time</span>
          </button>
        </div>

        {/* Period Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleNextPeriod}
            disabled={!isPeriodComplete && isTracking}
            className={`h-12 rounded-lg font-bold text-white flex items-center justify-center space-x-2 ${
              isPeriodComplete || !isTracking
                ? 'bg-purple-500 hover:bg-purple-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <SkipForward className="w-5 h-5" />
            <span>
              {currentGame.currentPeriod && currentGame.currentPeriod < currentGame.periods 
                ? 'Next Period' 
                : 'Start Overtime'}
            </span>
          </button>

          <button
            onClick={handleEndGame}
            className="h-12 bg-red-500 hover:bg-red-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2"
          >
            <Square className="w-5 h-5" />
            <span>End Game</span>
          </button>
        </div>
      </div>

      {/* Game Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Game Summary</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">
              {currentGame?.homeScore || 0} - {currentGame?.awayScore || 0}
            </div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">
              P{currentGame?.currentPeriod || 1}
            </div>
            <div className="text-sm text-gray-600">Period</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">
              {Math.floor(gameTime / 60)}:{String(gameTime % 60).padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600">Game Time</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">
              {currentGame?.timeoutUsed ? 'Used' : 'Available'}
            </div>
            <div className="text-sm text-gray-600">Timeout</div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/live/tracking')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-6 px-4 rounded-lg flex items-center justify-center space-x-3"
        >
          <Target className="w-8 h-8" />
          <div>
            <div className="text-xl">Track Data</div>
            <div className="text-sm opacity-90">Live game tracking</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/live/draw')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-6 px-4 rounded-lg flex items-center justify-center space-x-3"
        >
          <Zap className="w-8 h-8" />
          <div>
            <div className="text-xl">Draw Play</div>
            <div className="text-sm opacity-90">Tactical board</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/live/stats')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-6 px-4 rounded-lg flex items-center justify-center space-x-3"
        >
          <BarChart3 className="w-8 h-8" />
          <div>
            <div className="text-xl">Quick Stats</div>
            <div className="text-sm opacity-90">Live analytics</div>
          </div>
        </button>
      </div>


      {/* Manual Time Input Modal */}
      {isTimeInputOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-80">
            <h3 className="text-lg font-semibold mb-4">Set Game Time</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Time (MM:SS)</label>
              <input
                type="text"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="05:30"
                className="w-full p-3 border rounded-lg text-center text-xl font-mono"
                pattern="[0-9]{1,2}:[0-9]{2}"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSetTime}
                className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Set Time
              </button>
              <button
                onClick={() => {
                  setIsTimeInputOpen(false);
                  setTimeInput('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTracking;