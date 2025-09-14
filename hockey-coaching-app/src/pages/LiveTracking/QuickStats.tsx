import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../stores/gameStore';
import { ArrowLeft, Target, Percent } from 'lucide-react';
import type { Shot } from '../../types';

const QuickStats: React.FC = () => {
  const navigate = useNavigate();
  const { currentGame, shots: allShots, events, isTracking } = useGameStore();
  const [displayedShots, setDisplayedShots] = useState<Shot[]>([]);
  const [faceoffStats, setFaceoffStats] = useState({ wins: 0, losses: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!currentGame) return;

    // Filter shots and faceoffs based on selected period
    let filteredShots: Shot[];
    let filteredEvents;

    if (selectedPeriod === 'all') {
      filteredShots = allShots;
      filteredEvents = events.filter(event =>
        event.type === 'faceoff_won' || event.type === 'faceoff_lost'
      );
    } else {
      filteredShots = allShots.filter(shot => shot.period === selectedPeriod);
      filteredEvents = events.filter(event =>
        event.period === selectedPeriod &&
        (event.type === 'faceoff_won' || event.type === 'faceoff_lost')
      );
    }

    setDisplayedShots(filteredShots);

    const wins = filteredEvents.filter(event => event.type === 'faceoff_won').length;
    const losses = filteredEvents.filter(event => event.type === 'faceoff_lost').length;
    setFaceoffStats({ wins, losses });
  }, [currentGame, allShots, events, selectedPeriod]);

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
  const ourGoals = displayedShots.filter(shot => shot.result === 'goal').length;
  const ourTotalShots = displayedShots.length;
  
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
        {displayedShots.map((shot) => {
          return (
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
          );
        })}

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
        <h1 className="text-2xl font-bold">
          {selectedPeriod === 'all' ? 'Game Stats' : `Period ${selectedPeriod} Stats`}
        </h1>
        <div className="w-32"></div> {/* Spacer */}
      </div>

      {/* Period Filter Buttons */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Game
          </button>
          <button
            onClick={() => setSelectedPeriod(1)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Period 1
          </button>
          <button
            onClick={() => setSelectedPeriod(2)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 2
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Period 2
          </button>
          {currentGame.hasOvertime && currentPeriod > 2 && (
            <button
              onClick={() => setSelectedPeriod(3)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === 3
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              OT
            </button>
          )}
        </div>
      </div>

      {/* Shot Count - Large and prominent */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-center mb-4">
          Our Shots {selectedPeriod === 'all' ? 'This Game' : `Period ${selectedPeriod}`}
        </h2>
        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-2">{ourTotalShots}</div>
          <div className="text-xl text-gray-600">Total Shots</div>
          <div className="text-lg text-green-600 mt-2">{ourGoals} Goals</div>
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