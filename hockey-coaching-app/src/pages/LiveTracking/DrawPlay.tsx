import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Clock, RefreshCcw } from 'lucide-react';
import AdvancedDrawingCanvas from '../../components/AdvancedDrawingCanvas';
import ProfessionalToolbar from '../../components/ProfessionalToolbar';
import { useDrawingHistory } from '../../lib/drawing/history';
import { generateId } from '../../lib/drawing/utils';
import { dbHelpers } from '../../db';
import type { DrawingElement, DrawingToolType, DrawingColor, TacticalDrawing, GameEvent } from '../../types';

interface SavedPlay {
  id: string;
  title: string;
  gameTime: string;
  period: number;
  elements: DrawingElement[];
  timestamp: number;
}

const DrawPlay: React.FC = () => {
  const navigate = useNavigate();
  
  // Drawing state
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<DrawingToolType>('arrow');
  const [selectedColor, setSelectedColor] = useState<DrawingColor>('blue');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  
  // History management
  const { saveState, undo, redo, clear: clearHistory, canUndo, canRedo } = useDrawingHistory();
  
  // Play management
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [currentGameTime, setCurrentGameTime] = useState('0:00');
  const [playTitle, setPlayTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSavedPlays, setShowSavedPlays] = useState(false);

  // Load current game data and saved plays
  useEffect(() => {
    loadGameData();
    loadSavedPlays();
  }, []);

  const loadGameData = async () => {
    try {
      const games = await dbHelpers.getAllGames();
      const activeGame = games.find(game => game.status === 'live');
      
      if (activeGame) {
        setCurrentGameId(activeGame.id);
        setCurrentPeriod(activeGame.currentPeriod || 1);
        setCurrentGameTime('0:00');
      }
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const loadSavedPlays = async () => {
    try {
      if (!currentGameId) return;
      
      const events = await dbHelpers.getEventsByGame(currentGameId);
      const tacticalDrawings = events.filter(event => event.type === 'tactical_drawing');
      
      const plays: SavedPlay[] = tacticalDrawings.map(event => {
        const drawingData = event.data as TacticalDrawing;
        const minutes = Math.floor(event.gameTime / 60);
        const seconds = event.gameTime % 60;
        
        return {
          id: event.id,
          title: drawingData.title || `Play - P${event.period} ${minutes}:${seconds.toString().padStart(2, '0')}`,
          gameTime: `${minutes}:${seconds.toString().padStart(2, '0')}`,
          period: event.period,
          elements: drawingData.elements,
          timestamp: event.timestamp
        };
      });
      
      setSavedPlays(plays.reverse());
    } catch (error) {
      console.error('Error loading saved plays:', error);
    }
  };

  const handleElementsChange = useCallback((newElements: DrawingElement[]) => {
    saveState(drawingElements);
    setDrawingElements(newElements);
  }, [drawingElements, saveState]);

  const handleStartDrawing = useCallback(() => {
    saveState(drawingElements);
  }, [drawingElements, saveState]);

  const handleUndo = useCallback(() => {
    const previousElements = undo(drawingElements);
    if (previousElements) {
      setDrawingElements(previousElements);
    }
  }, [drawingElements, undo]);

  const handleRedo = useCallback(() => {
    const nextElements = redo(drawingElements);
    if (nextElements) {
      setDrawingElements(nextElements);
    }
  }, [drawingElements, redo]);

  const handleClear = useCallback(() => {
    if (drawingElements.length > 0) {
      saveState(drawingElements);
      setDrawingElements([]);
      setSelectedElements([]);
      setPlayTitle('');
      setNotes('');
    }
  }, [drawingElements, saveState]);

  const savePlayToGame = async () => {
    if (!currentGameId || drawingElements.length === 0) {
      alert('Nothing to save or no active game');
      return;
    }

    try {
      setIsLoading(true);

      const tacticalDrawing: TacticalDrawing = {
        id: generateId(),
        gameId: currentGameId,
        elements: [...drawingElements],
        period: currentPeriod,
        gameTime: 0,
        timestamp: Date.now(),
        title: playTitle.trim() || `Tactical Play - P${currentPeriod}`,
        notes: notes.trim()
      };

      const gameEvent: GameEvent = {
        id: generateId(),
        gameId: currentGameId,
        type: 'tactical_drawing',
        period: currentPeriod,
        gameTime: 0,
        timestamp: Date.now(),
        description: tacticalDrawing.title || 'Tactical Drawing',
        data: tacticalDrawing
      };

      await dbHelpers.createGameEvent(gameEvent);
      
      // Clear current drawing
      handleClear();
      clearHistory();
      
      // Reload saved plays
      await loadSavedPlays();
      
      alert('Play saved to game successfully!');
    } catch (error) {
      console.error('Error saving play:', error);
      alert('Error saving play. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedPlay = (play: SavedPlay) => {
    if (drawingElements.length > 0 && !window.confirm('This will replace your current drawing. Continue?')) {
      return;
    }
    
    saveState(drawingElements);
    setDrawingElements([...play.elements]);
    setSelectedElements([]);
    setPlayTitle(play.title);
    setShowSavedPlays(false);
  };

  const deleteSavedPlay = async (playId: string) => {
    if (!window.confirm('Delete this saved play? This cannot be undone.')) {
      return;
    }

    try {
      await dbHelpers.deleteGameEvent(playId);
      await loadSavedPlays();
    } catch (error) {
      console.error('Error deleting play:', error);
      alert('Error deleting play. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/live')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Live Tracking</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tactical Board</h1>
              {currentGameId && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>P{currentPeriod} - {currentGameTime}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSavedPlays(!showSavedPlays)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                showSavedPlays 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm">Plays ({savedPlays.length})</span>
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <button
              onClick={savePlayToGame}
              disabled={isLoading || drawingElements.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoading ? 'Saving...' : 'Save to Game'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Plays Sidebar */}
      <div className={`fixed top-16 right-0 w-80 h-full bg-white shadow-lg transform transition-transform z-40 ${
        showSavedPlays ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Saved Plays ({savedPlays.length})</h3>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
          {/* Current Play Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Play Title
              </label>
              <input
                type="text"
                value={playTitle}
                onChange={(e) => setPlayTitle(e.target.value)}
                placeholder="e.g., Powerplay Entry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Quick notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              />
            </div>
          </div>

          {/* Saved Plays List */}
          <div className="pt-4 border-t">
            {savedPlays.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-8">
                No plays saved yet.<br />
                Create a drawing and save it to build your playbook.
              </p>
            ) : (
              <div className="space-y-2">
                {savedPlays.map((play) => (
                  <div
                    key={play.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <button
                      onClick={() => loadSavedPlay(play)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {play.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        P{play.period} - {play.gameTime} • {play.elements.length} elements
                      </div>
                    </button>
                    
                    <button
                      onClick={() => deleteSavedPlay(play.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showSavedPlays && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setShowSavedPlays(false)}
        />
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 p-4 pb-24">
        <div className="bg-white rounded-xl shadow-lg border h-full flex items-center justify-center">
          <div className="relative max-w-full max-h-full">
            <AdvancedDrawingCanvas
              elements={drawingElements}
              selectedTool={selectedTool}
              selectedColor={selectedColor}
              selectedElements={selectedElements}
              onElementsChange={handleElementsChange}
              onSelectionChange={setSelectedElements}
              onStartDrawing={handleStartDrawing}
              width={800}
              height={400}
              rinkImageSrc="/images/rink.png"
            />
            
            {/* Status indicators */}
            {drawingElements.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm shadow-sm">
                {drawingElements.length} element{drawingElements.length !== 1 ? 's' : ''}
              </div>
            )}
            
            {!currentGameId && (
              <div className="absolute bottom-2 left-2 bg-orange-500 text-white px-3 py-1 rounded-lg text-sm shadow-sm">
                No active game
              </div>
            )}

            {selectedTool !== 'pointer' && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm shadow-sm">
                {selectedTool.replace('_', ' ')} tool
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Toolbar */}
      <ProfessionalToolbar
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        onToolChange={setSelectedTool}
        onColorChange={setSelectedColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
};

export default DrawPlay;