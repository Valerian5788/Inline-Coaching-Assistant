import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../stores/gameStore';
import { dbHelpers } from '../../db';
import { ArrowLeft, Target, Percent } from 'lucide-react';
import type { Shot, GoalAgainst, GameEvent } from '../../types';

const QuickStats: React.FC = () => {
  const navigate = useNavigate();
  const { currentGame, shots: allShots, goalsAgainst, events, isTracking } = useGameStore();
  const [currentPeriodShots, setCurrentPeriodShots] = useState<Shot[]>([]);
  const [currentPeriodGoalsAgainst, setCurrentPeriodGoalsAgainst] = useState<GoalAgainst[]>([]);
  const [faceoffStats, setFaceoffStats] = useState({ wins: 0, losses: 0 });

  useEffect(() => {
    if (!currentGame) return;
    
    const currentPeriod = currentGame.currentPeriod || 1;
    
    // Filter shots for current period
    const periodShots = allShots.filter(shot => shot.period === currentPeriod);
    setCurrentPeriodShots(periodShots);
    
    // Filter goals against for current period
    const periodGoalsAgainst = goalsAgainst.filter(goal => goal.period === currentPeriod);
    setCurrentPeriodGoalsAgainst(periodGoalsAgainst);
    
    // Calculate faceoff stats for current period
    const periodFaceoffs = events.filter(event => 
      event.period === currentPeriod && 
      (event.type === 'faceoff_won' || event.type === 'faceoff_lost')
    );
    
    const wins = periodFaceoffs.filter(event => event.type === 'faceoff_won').length;
    const losses = periodFaceoffs.filter(event => event.type === 'faceoff_lost').length;
    setFaceoffStats({ wins, losses });
  }, [currentGame, allShots, goalsAgainst, events]);

  // Auto-refresh every 5 seconds if game is live
  useEffect(() => {
    if (!isTracking || !currentGame) return;
    
    const interval = setInterval(() => {
      // Trigger re-render by updating timestamp (this will re-run the effect above)
      // The useGameStore already updates when shots/events change, so this is just for safety
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isTracking, currentGame]);

  if (!currentGame) {
    navigate('/live');
    return null;
  }

  const currentPeriod = currentGame.currentPeriod || 1;
  const ourGoals = currentPeriodShots.filter(shot => shot.result === 'goal').length;
  const ourTotalShots = currentPeriodShots.length;
  const theirGoals = currentPeriodGoalsAgainst.length;
  
  const shootingPercentage = ourTotalShots > 0 ? (ourGoals / ourTotalShots) * 100 : 0;
  const faceoffTotal = faceoffStats.wins + faceoffStats.losses;
  const faceoffPercentage = faceoffTotal > 0 ? (faceoffStats.wins / faceoffTotal) * 100 : 0;

  // Create mini rink visualization
  const renderMiniRink = () => {
    return (
      <div className="relative bg-white border-2 border-gray-300 rounded-lg mx-auto" 
           style={{ width: '300px', height: '150px' }}>
        {/* Rink outline */}
        <div className="absolute inset-2 border border-gray-400 rounded-lg">
          {/* Center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-400"></div>
          
          {/* Goal creases */}
          <div className="absolute top-1/2 left-2 w-4 h-8 border border-gray-400 rounded-r-lg transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-2 w-4 h-8 border border-gray-400 rounded-l-lg transform -translate-y-1/2"></div>
        </div>

        {/* Our shots (blue dots, goals are larger) */}
        {currentPeriodShots.map((shot, index) => (
          <div
            key={shot.id}
            className={`absolute rounded-full ${
              shot.result === 'goal' 
                ? 'w-4 h-4 bg-blue-600' 
                : 'w-2 h-2 bg-blue-400'
            }`}
            style={{
              left: `${shot.x * 290 + 5}px`,
              top: `${shot.y * 140 + 5}px`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}

        {/* Their goals (red X marks) */}
        {currentPeriodGoalsAgainst.map((goal, index) => (
          <div
            key={goal.id}
            className="absolute text-red-600 font-bold text-lg"
            style={{
              left: `${goal.x * 290 + 5}px`,
              top: `${goal.y * 140 + 5}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            ✗
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/live')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>Back to Game</span>
        </button>
        <h1 className="text-2xl font-bold">Period {currentPeriod} Stats</h1>
        <div className="w-32"></div> {/* Spacer */}
      </div>

      {/* Shot Count - Large and prominent */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-center mb-4">Shots This Period</h2>
        <div className="flex justify-center items-center space-x-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">{ourTotalShots}</div>
            <div className="text-lg text-gray-600">Us</div>
          </div>
          <div className="text-3xl font-bold text-gray-400">|</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600">{theirGoals}</div>
            <div className="text-lg text-gray-600">Them</div>
          </div>
        </div>
      </div>

      {/* Mini Rink Visualization */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-center mb-4">Shot Locations</h3>
        {renderMiniRink()}
        <div className="flex justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>Our Shots</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            <span>Our Goals</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-red-600 font-bold">✗</span>
            <span>Their Goals</span>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Percent className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold">Shooting %</h3>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {shootingPercentage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {ourGoals} goals / {ourTotalShots} shots
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="w-6 h-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold">Faceoffs</h3>
          </div>
          <div className="text-3xl font-bold text-purple-600">
            {faceoffTotal > 0 ? `${faceoffPercentage.toFixed(0)}%` : '0%'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {faceoffStats.wins}-{faceoffStats.losses} record
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;