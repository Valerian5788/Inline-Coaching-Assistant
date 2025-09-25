import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../stores/gameStore';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Target,
  RotateCcw,
  X,
  Undo
} from 'lucide-react';
import type { ShotResult, TeamSide } from '../../types';

const ShotTracking: React.FC = () => {
  const navigate = useNavigate();
  const rinkRef = useRef<HTMLDivElement>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showShotPopup, setShowShotPopup] = useState(false);
  const [showGoalAgainstPopup, setShowGoalAgainstPopup] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [normalizedCoords, setNormalizedCoords] = useState({ x: 0, y: 0 });
  const [showFaceoffButtons, setShowFaceoffButtons] = useState(false);
  const [showStartTrackingButton, setShowStartTrackingButton] = useState(true);
  const [showTimeAdjust, setShowTimeAdjust] = useState(false);
  const [timeAdjustInput, setTimeAdjustInput] = useState('');
  const [timeAdjustMode, setTimeAdjustMode] = useState<'+' | '-'>('+');

  const {
    currentGame,
    isTracking,
    isPaused,
    gameTime,
    events,
    startTracking,
    pauseTracking,
    resumeTracking,
    addShot,
    addGoalAgainst,
    undoLastAction,
    canUndo,
    adjustTime,
    addFaceoffWin,
    addFaceoffLoss
  } = useGameStore();

  // Keyboard handler for undo
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'z' && !showShotPopup && !showGoalAgainstPopup && canUndo()) {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShotPopup, showGoalAgainstPopup, canUndo]);

  // Manage start tracking button and faceoff ribbon
  useEffect(() => {
    if (currentGame && !isTracking) {
      setShowStartTrackingButton(true);
      setShowFaceoffButtons(false);
    } else {
      setShowStartTrackingButton(false);
    }
  }, [currentGame, isTracking]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isTracking && !isPaused) {
      pauseTracking();
      setShowFaceoffButtons(true); // Show faceoff ribbon when pausing
    } else if (isTracking && isPaused) {
      resumeTracking();
      setShowFaceoffButtons(false); // Hide faceoff ribbon when resuming
    } else {
      startTracking();
    }
  };

  // Calculate which side team is defending based on period and initialTeamSide
  const getCurrentTeamSide = (): { defending: 'left' | 'right', teamSide: TeamSide } => {
    if (!currentGame || !currentGame.initialTeamSide) {
      return { defending: 'left', teamSide: 'home' };
    }

    const currentPeriod = currentGame.currentPeriod || 1;
    
    // Teams alternate sides each period
    // Period 1: initial side, Period 2: opposite side, Period 3: initial side, etc.
    const isOddPeriod = currentPeriod % 2 === 1;
    const defending = isOddPeriod ? currentGame.initialTeamSide : (currentGame.initialTeamSide === 'left' ? 'right' : 'left');
    
    // For coordinate conversion: defending left = 'home', defending right = 'away'
    const teamSide: TeamSide = defending === 'left' ? 'home' : 'away';
    
    return { defending, teamSide };
  };

  const handleUndo = async () => {
    if (!currentGame || !canUndo()) return;

    const success = await undoLastAction();
    if (success) {
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Last action undone';
      document.body.appendChild(toast);

      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    }
  };

  const getCurrentPeriodTime = () => {
    if (!currentGame) return { remaining: 0 };
    const periodLength = currentGame.periodMinutes * 60;
    const currentPeriod = currentGame.currentPeriod || 1;
    const periodStartTime = (currentPeriod - 1) * periodLength;
    const periodElapsed = gameTime - periodStartTime;
    const periodRemaining = Math.max(0, periodLength - periodElapsed);
    return { remaining: periodRemaining };
  };

  // Convert screen coordinates to normalized rink coordinates (0-1)
  const convertToNormalizedCoords = useCallback((clientX: number, clientY: number) => {
    if (!rinkRef.current) return { x: 0, y: 0 };

    const rect = rinkRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    // Normalize to 0-1 based on rink dimensions
    let normalizedX = relativeX / rect.width;
    let normalizedY = relativeY / rect.height;

    // Ensure coordinates are within bounds
    normalizedX = Math.max(0, Math.min(1, normalizedX));
    normalizedY = Math.max(0, Math.min(1, normalizedY));

    console.log('Recording:', {x: normalizedX, y: normalizedY});

    return { x: normalizedX, y: normalizedY };
  }, [currentGame]);

  const handleRinkClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (showShotPopup || showGoalAgainstPopup) return;

    const clientX = event.clientX;
    const clientY = event.clientY;
    const normalizedCoords = convertToNormalizedCoords(clientX, clientY);

    setClickPosition({ x: clientX, y: clientY });
    setNormalizedCoords(normalizedCoords);

    // Handle double tap detection
    if (tapTimeoutRef.current) {
      // Double tap detected
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      setShowGoalAgainstPopup(true);
      pauseTracking(); // Auto-pause on goal against
    } else {
      // Single tap - wait for potential second tap
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        setShowShotPopup(true);
      }, 300); // 300ms window for double tap
    }
  }, [showShotPopup, showGoalAgainstPopup, convertToNormalizedCoords, pauseTracking]);

  const handleShotResult = async (result: ShotResult) => {
    if (!currentGame) return;

    const { teamSide } = getCurrentTeamSide();

    await addShot({
      period: currentGame.currentPeriod || 1,
      x: normalizedCoords.x,
      y: normalizedCoords.y,
      result,
      teamSide
    });

    // If shot result is goal, increment home team score (single tap = our team goal)
    if (result === 'goal') {
      const gameStore = useGameStore.getState();
      await gameStore.addHomeGoal();
    }

    // Auto-pause on goal or save
    if (result === 'goal' || result === 'save') {
      pauseTracking();
      setShowFaceoffButtons(true); // Show faceoff ribbon after auto-pause
    }

    setShowShotPopup(false);
  };

  const handleGoalAgainst = async (reason: string) => {
    if (!currentGame) return;

    await addGoalAgainst({
      period: currentGame.currentPeriod || 1,
      x: normalizedCoords.x,
      y: normalizedCoords.y,
      reason
    });

    // Double tap = goal against us, so increment away team score
    const gameStore = useGameStore.getState();
    await gameStore.addAwayGoal();

    // Auto-pause and show faceoff ribbon after goal against
    pauseTracking();
    setShowFaceoffButtons(true);

    setShowGoalAgainstPopup(false);
  };

  const closePopups = () => {
    setShowShotPopup(false);
    setShowGoalAgainstPopup(false);
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }
  };

  // Faceoff tracking handlers
  const handleStartTracking = () => {
    setShowStartTrackingButton(false);
    setShowFaceoffButtons(true); // Show faceoff ribbon when starting period
  };

  const handleFaceoffWon = async () => {
    await addFaceoffWin();
    setShowFaceoffButtons(false);
  };

  const handleFaceoffLost = async () => {
    await addFaceoffLoss();
    setShowFaceoffButtons(false);
  };

  const handleFaceoffPlayPause = () => {
    if (isTracking && !isPaused) {
      pauseTracking();
    } else if (isTracking && isPaused) {
      resumeTracking();
    } else {
      startTracking();
    }
    // Keep faceoff buttons visible - they decide when to record result
  };

  const handleTimeAdjust = () => {
    const seconds = parseInt(timeAdjustInput);
    if (!isNaN(seconds) && seconds > 0) {
      const adjustment = timeAdjustMode === '+' ? seconds : -seconds;
      adjustTime(adjustment);
      setTimeAdjustInput('');
      setShowTimeAdjust(false);
    }
  };

  // Calculate current period faceoff stats
  const getCurrentPeriodFaceoffs = () => {
    if (!currentGame) return { wins: 0, losses: 0, percentage: 0 };
    
    const currentPeriod = currentGame.currentPeriod || 1;
    const periodFaceoffs = events.filter(event => 
      event.period === currentPeriod && 
      (event.type === 'faceoff_won' || event.type === 'faceoff_lost')
    );
    
    const wins = periodFaceoffs.filter(event => event.type === 'faceoff_won').length;
    const losses = periodFaceoffs.filter(event => event.type === 'faceoff_lost').length;
    const total = wins + losses;
    const percentage = total > 0 ? (wins / total) * 100 : 0;
    
    return { wins, losses, percentage, total };
  };

  if (!currentGame) {
    navigate('/live');
    return null;
  }

  const periodTime = getCurrentPeriodTime();
  const faceoffStats = getCurrentPeriodFaceoffs();

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full-screen rink background */}
      <div
        ref={rinkRef}
        className={`absolute inset-0 bg-center bg-contain bg-no-repeat cursor-crosshair transition-all duration-300 ${
          showStartTrackingButton ? 'blur-sm' : ''
        }`}
        style={{
          backgroundImage: 'url(/images/rink.png), url(/images/rink-placeholder.svg)',
          backgroundSize: 'contain'
        }}
        onClick={showStartTrackingButton ? undefined : handleRinkClick}
      />

      {/* Semi-transparent overlay UI */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
        showStartTrackingButton ? 'blur-sm opacity-50' : ''
      }`}>
        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/live')}
            className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Game info */}
          <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-center">
            <div className="text-lg font-bold">
              Period {currentGame.currentPeriod || 1} - {formatTime(periodTime.remaining)}
            </div>
            <div className="text-sm opacity-90">
              {currentGame.homeScore || 0} - {currentGame.awayScore || 0}
            </div>
            <div className="text-xs text-blue-300 mt-1">
              Faceoffs: {faceoffStats.wins}-{faceoffStats.losses} ({faceoffStats.percentage.toFixed(0)}%)
            </div>
          </div>

          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className={`p-3 rounded-full transition-colors ${
              isTracking && !isPaused 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {isTracking && !isPaused ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Team side indicator */}
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg">
            <div className="text-sm mb-1">Defending:</div>
            <div className={`px-3 py-1 text-sm rounded font-medium ${
              getCurrentTeamSide().defending === 'left' 
                ? 'bg-blue-500' 
                : 'bg-red-500'
            }`}>
              {getCurrentTeamSide().defending.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Undo button - show if can undo within time window */}
        {canUndo() && (
          <div className="absolute bottom-24 left-4 pointer-events-auto">
            <button
              onClick={handleUndo}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg transition-colors"
              title="Undo last action (Z key) - 30 sec window"
            >
              <Undo className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg text-sm">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="w-4 h-4" />
              <span>Single tap: Our shot</span>
            </div>
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>Double tap: Goal against</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shot Result Popup */}
      {showShotPopup && (
        <div 
          className="absolute pointer-events-auto bg-white rounded-lg shadow-lg p-4"
          style={{
            left: Math.min(clickPosition.x - 100, window.innerWidth - 220),
            top: Math.min(clickPosition.y - 100, window.innerHeight - 180),
            width: '200px'
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Shot Result</h3>
            <button onClick={closePopups} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleShotResult('goal')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-2 rounded text-sm"
            >
              Goal
            </button>
            <button
              onClick={() => handleShotResult('save')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-2 rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={() => handleShotResult('miss')}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-2 rounded text-sm"
            >
              Miss
            </button>
            <button
              onClick={() => handleShotResult('blocked')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-2 rounded text-sm"
            >
              Rebound
            </button>
          </div>
        </div>
      )}

      {/* Goal Against Popup */}
      {showGoalAgainstPopup && (
        <div 
          className="absolute pointer-events-auto bg-white rounded-lg shadow-lg p-4"
          style={{
            left: Math.min(clickPosition.x - 125, window.innerWidth - 270),
            top: Math.min(clickPosition.y - 140, window.innerHeight - 320),
            width: '250px'
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-red-600">Goal Against</h3>
            <button onClick={closePopups} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => handleGoalAgainst('Bad coverage')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded text-sm"
            >
              Bad Coverage
            </button>
            <button
              onClick={() => handleGoalAgainst('Duel lost')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded text-sm"
            >
              Duel Lost
            </button>
            <button
              onClick={() => handleGoalAgainst('Screened shot')}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded text-sm"
            >
              Screened Shot
            </button>
            <button
              onClick={() => handleGoalAgainst('Other')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded text-sm"
            >
              Other
            </button>
          </div>
        </div>
      )}

      {/* Start Game Button - Centered */}
      {showStartTrackingButton && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <button
            onClick={handleStartTracking}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg shadow-2xl text-xl border-4 border-white"
          >
            🏒 Start Game
          </button>
        </div>
      )}

      {/* Faceoff Tracking Ribbon */}
      {showFaceoffButtons && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border-2 border-blue-500 p-3 z-50 pointer-events-auto">
          <div className="flex items-center space-x-2">
            {/* Win Button */}
            <button
              onClick={handleFaceoffWon}
              disabled={!isTracking || isPaused}
              className={`font-bold py-2 px-3 rounded-lg flex items-center space-x-1 text-sm transition-colors ${
                isTracking && !isPaused
                  ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>✓</span>
              <span>WIN</span>
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={handleFaceoffPlayPause}
              className={`font-bold py-2 px-3 rounded-lg flex items-center space-x-1 text-sm ${
                isTracking && !isPaused 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isTracking && !isPaused ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>PLAY</span>
                </>
              )}
            </button>

            {/* Lost Button */}
            <button
              onClick={handleFaceoffLost}
              disabled={!isTracking || isPaused}
              className={`font-bold py-2 px-3 rounded-lg flex items-center space-x-1 text-sm transition-colors ${
                isTracking && !isPaused
                  ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>✗</span>
              <span>LOST</span>
            </button>

            {/* Time Adjust */}
            <div className="relative">
              <button
                onClick={() => setShowTimeAdjust(!showTimeAdjust)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-2 rounded-lg text-xs font-mono"
                title="Adjust time"
              >
                ±T
              </button>
              
              {showTimeAdjust && (
                <div className="absolute top-full mt-1 right-0 bg-white border rounded-lg shadow-lg p-2 z-10 min-w-24">
                  <div className="flex items-center space-x-1 text-xs">
                    {/* +/- Toggle */}
                    <button
                      onClick={() => setTimeAdjustMode(timeAdjustMode === '+' ? '-' : '+')}
                      className={`px-2 py-1 rounded font-bold ${
                        timeAdjustMode === '+' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {timeAdjustMode}
                    </button>
                    
                    {/* Number Input */}
                    <input
                      type="number"
                      value={timeAdjustInput}
                      onChange={(e) => setTimeAdjustInput(e.target.value)}
                      placeholder="sec"
                      min="1"
                      className="w-12 px-1 py-1 border rounded text-center text-xs"
                    />
                    
                    {/* Apply Button */}
                    <button
                      onClick={handleTimeAdjust}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Escape Button */}
            <button
              onClick={() => setShowFaceoffButtons(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-lg"
              title="Skip faceoff tracking"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotTracking;