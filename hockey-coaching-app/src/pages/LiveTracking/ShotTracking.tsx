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

  const {
    currentGame,
    isTracking,
    isPaused,
    gameTime,
    shots,
    pauseTracking,
    resumeTracking,
    addShot,
    addGoalAgainst,
    undoLastShot
  } = useGameStore();

  // Keyboard handler for undo
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'z' && !showShotPopup && !showGoalAgainstPopup) {
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShotPopup, showGoalAgainstPopup]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    if (!currentGame || shots.length === 0) return;
    
    const success = await undoLastShot();
    if (success) {
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Shot removed';
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

    // Get current team side (which end we're defending)
    const { teamSide } = getCurrentTeamSide();
    
    // Adjust coordinates based on team side (which end we're defending)
    // If defending the right side, flip the X coordinate so shots are always relative to attacking zone
    if (teamSide === 'away') {
      normalizedX = 1 - normalizedX;
    }

    // Ensure coordinates are within bounds
    normalizedX = Math.max(0, Math.min(1, normalizedX));
    normalizedY = Math.max(0, Math.min(1, normalizedY));

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

    // Auto-pause on goal or save
    if (result === 'goal' || result === 'save') {
      pauseTracking();
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

  if (!currentGame) {
    navigate('/live');
    return null;
  }

  const periodTime = getCurrentPeriodTime();

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full-screen rink background */}
      <div
        ref={rinkRef}
        className="absolute inset-0 bg-center bg-contain bg-no-repeat cursor-crosshair"
        style={{
          backgroundImage: 'url(/images/rink.png), url(/images/rink-placeholder.svg)',
          backgroundSize: 'contain'
        }}
        onClick={handleRinkClick}
      />

      {/* Semi-transparent overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
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
          </div>

          {/* Play/Pause button */}
          <button
            onClick={isTracking && !isPaused ? pauseTracking : resumeTracking}
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

        {/* Undo button - only show if there are shots */}
        {shots.length > 0 && (
          <div className="absolute bottom-24 left-4 pointer-events-auto">
            <button
              onClick={handleUndo}
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg transition-colors"
              title="Undo last shot (Z key)"
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
    </div>
  );
};

export default ShotTracking;