import React, { useRef, useEffect } from 'react';
import { Shield, Crosshair } from 'lucide-react';
import type { ComparisonMode } from '../../types';
import type {
  GameComparisonData,
  NormalizedShotWithGame
} from '../../utils/shotNormalization';
import { getEnhancedShotColor } from '../../lib/utils/analysis';

interface MultiRinkVisualizationProps {
  gameComparisons: GameComparisonData[];
  comparisonMode: ComparisonMode;
  aggregatedShots?: NormalizedShotWithGame[];
  onShotHover?: (shot: NormalizedShotWithGame | null) => void;
  className?: string;
}

const MultiRinkVisualization: React.FC<MultiRinkVisualizationProps> = ({
  gameComparisons,
  comparisonMode,
  aggregatedShots,
  onShotHover,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Single rink component for reuse
  const RinkDisplay: React.FC<{
    shots: NormalizedShotWithGame[];
    title?: string;
    subtitle?: string;
    color?: string;
    opacity?: number;
    showLabels?: boolean;
  }> = ({ shots, title, subtitle, color, opacity = 1, showLabels = true }) => {
    return (
      <div className="relative">
        {/* Header */}
        {title && (
          <div className="mb-2 text-center">
            <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
            {subtitle && (
              <p className="text-xs text-gray-600">{subtitle}</p>
            )}
          </div>
        )}

        {/* Rink Container */}
        <div
          className="relative w-full bg-center bg-contain bg-no-repeat border border-gray-300 rounded"
          style={{
            backgroundImage: 'url(/images/rink.png), url(/images/rink-placeholder.svg)',
            backgroundSize: 'contain',
            aspectRatio: '2/1',
            minHeight: '200px'
          }}
        >
          {/* Zone Labels */}
          {showLabels && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Defensive Zone Label (Left) */}
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-blue-100 bg-opacity-90 rounded-lg px-2 py-1 border border-blue-300">
                <div className="flex items-center space-x-1 text-blue-700 text-xs font-semibold">
                  <Shield className="w-3 h-3" />
                  <span>DEF</span>
                </div>
              </div>

              {/* Offensive Zone Label (Right) */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-100 bg-opacity-90 rounded-lg px-2 py-1 border border-green-300">
                <div className="flex items-center space-x-1 text-green-700 text-xs font-semibold">
                  <Crosshair className="w-3 h-3" />
                  <span>OFF</span>
                </div>
              </div>
            </div>
          )}

          {/* Shot Overlays */}
          {shots.map((shot, index) => {
            const shotColor = color || getEnhancedShotColor(shot.result, shot.dangerLevel);

            return (
              <div
                key={`${shot.id}-${index}`}
                className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-white shadow-sm hover:scale-150 transition-transform cursor-pointer"
                style={{
                  backgroundColor: shotColor,
                  opacity: opacity,
                  left: `${shot.normalizedX * 100}%`,
                  top: `${shot.normalizedY * 100}%`,
                  zIndex: 10
                }}
                onMouseEnter={() => onShotHover?.(shot)}
                onMouseLeave={() => onShotHover?.(null)}
                title={`${shot.result.charAt(0).toUpperCase() + shot.result.slice(1)} - Period ${shot.period}`}
              />
            );
          })}

          {/* Shot count overlay */}
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {shots.length} shots
          </div>
        </div>
      </div>
    );
  };

  // Render based on comparison mode
  const renderVisualization = () => {
    switch (comparisonMode) {
      case 'overlay':
        return (
          <div className="space-y-4">
            <RinkDisplay
              shots={gameComparisons.flatMap(game =>
                game.shots.map(shot => ({ ...shot, gameColor: game.color }))
              )}
              title="Overlay Comparison"
              subtitle={`${gameComparisons.length} games combined`}
            />

            {/* Legend for overlay mode */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {gameComparisons.map((game, index) => (
                <div key={game.gameId} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: game.color }}
                  />
                  <span className="text-xs text-gray-700">
                    {game.gameTitle} ({game.shots.length})
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'side-by-side':
        const itemsPerRow = gameComparisons.length <= 2 ? gameComparisons.length :
                           gameComparisons.length <= 4 ? 2 : 3;

        return (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
              maxWidth: '100%'
            }}
          >
            {gameComparisons.map((game) => (
              <RinkDisplay
                key={game.gameId}
                shots={game.shots}
                title={game.gameTitle}
                subtitle={`${game.gameDate} • ${game.shots.length} shots`}
                color={game.color}
                showLabels={itemsPerRow <= 2}
              />
            ))}
          </div>
        );

      case 'aggregate':
        if (!aggregatedShots) return null;

        return (
          <RinkDisplay
            shots={aggregatedShots}
            title="Aggregated Analysis"
            subtitle={`${gameComparisons.length} games • ${aggregatedShots.length} total shots`}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {renderVisualization()}

      {/* Shot legend - always show for reference */}
      <div className="flex justify-center mt-4">
        <div className="flex flex-wrap justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Goals</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Saves</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Misses</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Blocked</span>
          </div>
        </div>
      </div>

      {/* Responsive helper text */}
      {comparisonMode === 'side-by-side' && gameComparisons.length > 6 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Showing first {gameComparisons.slice(0, 6).length} games. Use overlay or aggregate mode to view all selected games.
        </div>
      )}
    </div>
  );
};

export default MultiRinkVisualization;