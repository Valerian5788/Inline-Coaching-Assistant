import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game, Team, Season, RinkSide, GamePreset } from '../types';
import { dbHelpers } from '../db';
import { useAppStore } from '../stores/appStore';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Plus, 
  Filter, 
  Play, 
  Clock, 
  Archive, 
  CalendarDays,
  Trophy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Zap,
  Edit,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Games: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [isSideSelectionOpen, setIsSideSelectionOpen] = useState(false);
  const [selectedGameForStart, setSelectedGameForStart] = useState<Game | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<GamePreset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditPresetModal, setShowEditPresetModal] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<GamePreset | null>(null);
  const [gamePresets, setGamePresets] = useState<GamePreset[]>([]);
  const [selectedGameForEdit, setSelectedGameForEdit] = useState<Game | null>(null);
  const [presetForm, setPresetForm] = useState({
    name: '',
    periods: 2,
    periodMinutes: 20,
    hasOvertime: false,
    overtimeMinutes: 5
  });
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    team: '',
    season: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [gameForm, setGameForm] = useState({
    homeTeamId: '',
    awayTeamName: '',
    date: '',
    time: '',
    seasonId: '',
    periods: 2,
    periodMinutes: 15,
    hasOvertime: true,
    overtimeMinutes: 5
  });

  const [gameFromPresetForm, setGameFromPresetForm] = useState({
    awayTeamName: '',
    date: '',
    time: '',
    seasonId: ''
  });

  const { currentSeason } = useAppStore();
  const { initializeLiveGame } = useGameStore();
  const { 
    isCreateGameExpanded, 
    isFiltersExpanded, 
    activeFilterCount,
    toggleCreateGame, 
    toggleFilters,
    setCreateGameExpanded,
    setActiveFilterCount
  } = useUIStore();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
    // Check for season filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const seasonParam = urlParams.get('season');
    if (seasonParam) {
      setSeasonFilter(seasonParam);
      setFilters(prev => ({ ...prev, season: seasonParam }));
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, filters]);

  useEffect(() => {
    // Set create game section collapsed if games exist
    if (games.length > 0 && isCreateGameExpanded) {
      setCreateGameExpanded(false);
    }
  }, [games.length]);

  useEffect(() => {
    // Calculate active filter count
    const count = Object.values(filters).filter(value => value !== '').length;
    setActiveFilterCount(count);
  }, [filters, setActiveFilterCount]);

  const loadData = async () => {
    try {
      const [allGames, allTeams, allSeasons, allPresets] = await Promise.all([
        dbHelpers.getAllGames(),
        dbHelpers.getAllTeams(), 
        dbHelpers.getAllSeasons(),
        dbHelpers.getAllGamePresets()
      ]);
      
      setGames(allGames);
      setTeams(allTeams);
      setSeasons(allSeasons);
      setGamePresets(allPresets);
      
      // Set default season to active season
      if (currentSeason) {
        setGameForm(prev => ({ ...prev, seasonId: currentSeason.id }));
        setGameFromPresetForm(prev => ({ ...prev, seasonId: currentSeason.id }));
      }
      
      // Set default date/time to now
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      setGameFromPresetForm(prev => ({ ...prev, date: dateStr, time: timeStr }));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...games];

    if (filters.team) {
      filtered = filtered.filter(game => 
        game.homeTeamId === filters.team || 
        game.awayTeamName.toLowerCase().includes(filters.team.toLowerCase())
      );
    }

    if (filters.season) {
      filtered = filtered.filter(game => game.seasonId === filters.season);
    }

    if (filters.status) {
      filtered = filtered.filter(game => game.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(game => new Date(game.date) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(game => new Date(game.date) <= new Date(filters.dateTo));
    }

    // Sort by date, most recent first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredGames(filtered);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const gameDateTime = new Date(`${gameForm.date}T${gameForm.time}`).toISOString();

    const newGame: Game = {
      id: crypto.randomUUID(),
      homeTeamId: gameForm.homeTeamId,
      awayTeamName: gameForm.awayTeamName,
      date: gameDateTime,
      status: 'planned',
      seasonId: gameForm.seasonId,
      periods: gameForm.periods,
      periodMinutes: gameForm.periodMinutes,
      hasOvertime: gameForm.hasOvertime,
      homeScore: 0,
      awayScore: 0,
      userId: currentUser.uid
    };

    await dbHelpers.createGame(newGame);
    resetForm();
    setIsCreateOpen(false);
    loadData();
  };

  const handleStartLiveTracking = async (game: Game) => {
    setSelectedGameForStart(game);
    setIsSideSelectionOpen(true);
  };

  const handleSideSelection = async (side: RinkSide) => {
    if (!selectedGameForStart) return;
    
    // Update game with initial team side
    const updatedGame = { ...selectedGameForStart, initialTeamSide: side };
    await dbHelpers.updateGame(selectedGameForStart.id, { initialTeamSide: side });
    
    setIsSideSelectionOpen(false);
    setSelectedGameForStart(null);
    
    await initializeLiveGame(updatedGame);
    navigate('/live');
  };

  const handleDeleteGame = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    const gameName = game ? `${getTeamName(game.homeTeamId)} vs ${game.awayTeamName}` : 'this game';
    
    if (confirm(`Delete game "${gameName}"?\n\nThis will permanently delete the game and all its data (shots, events, etc.).`)) {
      await dbHelpers.deleteGame(gameId);
      loadData();
    }
  };

  const resetForm = () => {
    setGameForm({
      homeTeamId: '',
      awayTeamName: '',
      date: '',
      time: '',
      seasonId: currentSeason?.id || '',
      periods: 2,
      periodMinutes: 15,
      hasOvertime: true,
      overtimeMinutes: 5
    });
  };


  const openPresetModal = (preset: GamePreset) => {
    setSelectedPreset(preset);
    setShowPresetModal(true);
  };

  const openEditPresetModal = (preset: GamePreset) => {
    setPresetToEdit(preset);
    setPresetForm({
      name: preset.name,
      periods: preset.periods,
      periodMinutes: preset.periodMinutes,
      hasOvertime: preset.hasOvertime,
      overtimeMinutes: preset.overtimeMinutes || 5
    });
    setShowEditPresetModal(true);
  };

  const createGameFromPreset = async () => {
    if (!selectedPreset || !gameFromPresetForm.awayTeamName.trim()) {
      alert('Please enter opponent name');
      return;
    }

    if (!currentSeason || teams.length === 0 || !currentUser) {
      alert('Please create a team and season first');
      return;
    }

    const gameDateTime = new Date(`${gameFromPresetForm.date}T${gameFromPresetForm.time}`).toISOString();

    const newGame: Game = {
      id: crypto.randomUUID(),
      homeTeamId: teams[0].id, // Use first available team
      awayTeamName: gameFromPresetForm.awayTeamName.trim(),
      date: gameDateTime,
      status: 'planned',
      seasonId: gameFromPresetForm.seasonId || currentSeason.id,
      periods: selectedPreset.periods,
      periodMinutes: selectedPreset.periodMinutes,
      hasOvertime: selectedPreset.hasOvertime,
      homeScore: 0,
      awayScore: 0,
      userId: currentUser.uid
    };

    await dbHelpers.createGame(newGame);
    loadData();
    setShowPresetModal(false);
    setGameFromPresetForm({ awayTeamName: '', date: gameFromPresetForm.date, time: gameFromPresetForm.time, seasonId: gameFromPresetForm.seasonId });
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = `${selectedPreset.name} created!`;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  };

  const savePreset = async () => {
    if (!presetToEdit) return;
    
    try {
      await dbHelpers.updateGamePreset(presetToEdit.id, {
        name: presetForm.name,
        periods: presetForm.periods,
        periodMinutes: presetForm.periodMinutes,
        hasOvertime: presetForm.hasOvertime,
        overtimeMinutes: presetForm.overtimeMinutes
      });
      
      setShowEditPresetModal(false);
      setPresetToEdit(null);
      loadData();
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Preset updated!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    } catch (error) {
      alert('Failed to update preset: ' + error);
    }
  };

  const createNewPreset = async () => {
    if (!presetForm.name.trim() || !currentUser) {
      alert('Please enter a preset name');
      return;
    }

    const newPreset: GamePreset = {
      id: crypto.randomUUID(),
      name: presetForm.name,
      periods: presetForm.periods,
      periodMinutes: presetForm.periodMinutes,
      hasOvertime: presetForm.hasOvertime,
      overtimeMinutes: presetForm.overtimeMinutes,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: currentUser.uid
    };
    
    try {
      await dbHelpers.createGamePreset(newPreset);
      setShowEditPresetModal(false);
      setPresetToEdit(null);
      loadData();
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'New preset created!';
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    } catch (error) {
      alert('Failed to create preset: ' + error);
    }
  };

  const deletePreset = async (preset: GamePreset) => {
    if (preset.isDefault) {
      alert('Cannot delete default presets');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the "${preset.name}" preset?`)) {
      try {
        await dbHelpers.deleteGamePreset(preset.id);
        loadData();
        
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = 'Preset deleted!';
        document.body.appendChild(toast);
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
      } catch (error) {
        alert('Failed to delete preset: ' + error);
      }
    }
  };

  const openEditModal = (game: Game) => {
    setSelectedGameForEdit(game);
    setGameForm({
      homeTeamId: game.homeTeamId,
      awayTeamName: game.awayTeamName,
      date: new Date(game.date).toISOString().split('T')[0],
      time: new Date(game.date).toTimeString().slice(0, 5),
      seasonId: game.seasonId,
      periods: game.periods,
      periodMinutes: game.periodMinutes,
      hasOvertime: game.hasOvertime || false,
      overtimeMinutes: 5
    });
    setShowEditModal(true);
  };

  const updateGame = async () => {
    if (!selectedGameForEdit) return;

    const gameDateTime = new Date(`${gameForm.date}T${gameForm.time}`).toISOString();
    
    const updatedGame: Game = {
      ...selectedGameForEdit,
      homeTeamId: gameForm.homeTeamId,
      awayTeamName: gameForm.awayTeamName,
      date: gameDateTime,
      seasonId: gameForm.seasonId,
      periods: gameForm.periods,
      periodMinutes: gameForm.periodMinutes,
      hasOvertime: gameForm.hasOvertime
    };

    await dbHelpers.updateGame(selectedGameForEdit.id, updatedGame);
    loadData();
    setShowEditModal(false);
    resetForm();
    
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = 'Game updated!';
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  };

  const clearSeasonFilter = () => {
    setSeasonFilter('');
    setFilters(prev => ({ ...prev, season: '' }));
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('season');
    window.history.replaceState({}, '', url);
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  const getSeasonName = (seasonId: string) => {
    const season = seasons.find(s => s.id === seasonId);
    return season ? season.name : 'Unknown Season';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusIcon = (status: Game['status']) => {
    switch (status) {
      case 'planned': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'live': return <Play className="w-4 h-4 text-green-600" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'live': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Group games by status
  const gamesByStatus = {
    planned: filteredGames.filter(g => g.status === 'planned'),
    live: filteredGames.filter(g => g.status === 'live'),
    archived: filteredGames.filter(g => g.status === 'archived')
  };

  const GameCard: React.FC<{ game: Game }> = ({ game }) => {
    const { date, time } = formatDateTime(game.date);
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:border-gray-300 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(game.status)}`}>
                <span className="flex items-center space-x-1">
                  {getStatusIcon(game.status)}
                  <span className="capitalize">{game.status}</span>
                </span>
              </span>
              <span className="text-xs text-gray-500">{getSeasonName(game.seasonId)}</span>
            </div>
            <h3 className="text-lg font-semibold">
              {getTeamName(game.homeTeamId)} vs {game.awayTeamName}
            </h3>
          </div>
          <div className="flex space-x-1">
            {game.status === 'planned' && (
              <button
                onClick={() => openEditModal(game)}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="Edit game"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDeleteGame(game.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CalendarDays className="w-4 h-4" />
            <span>{date} at {time}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{game.periods} periods × {game.periodMinutes} min</span>
            {game.hasOvertime && <span>+ OT</span>}
          </div>
          {game.status === 'archived' && (
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Trophy className="w-4 h-4" />
              <span>Final: {game.homeScore} - {game.awayScore}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {game.status === 'planned' && (
            <button
              onClick={() => handleStartLiveTracking(game)}
              className="flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Live Tracking</span>
            </button>
          )}
          {game.status === 'live' && (
            <button
              onClick={() => navigate('/live')}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Continue Tracking</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <div className="text-lg text-gray-600">Loading games...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Games</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Custom Game</span>
        </button>
      </div>

      {/* Collapsible Create Game Section */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden transition-all duration-200">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={toggleCreateGame}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleCreateGame();
            }
          }}
          aria-expanded={isCreateGameExpanded}
          aria-controls="create-game-content"
        >
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Create New Game</h3>
          </div>
          <div className="flex items-center space-x-2">
            {isCreateGameExpanded ? (
              <ChevronUp 
                className="w-5 h-5 text-gray-600 transition-transform duration-200" 
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px' }}
              />
            ) : (
              <ChevronDown 
                className="w-5 h-5 text-gray-600 transition-transform duration-200" 
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px' }}
              />
            )}
          </div>
        </div>
        
        <div 
          id="create-game-content"
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isCreateGameExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 pb-6">
            <div className="flex justify-between items-center mb-4">
              <div></div>
              <button
                onClick={() => {
                  setPresetToEdit(null);
                  setPresetForm({ name: '', periods: 2, periodMinutes: 20, hasOvertime: false, overtimeMinutes: 5 });
                  setShowEditPresetModal(true);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Preset</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gamePresets.map((preset) => (
                <div key={preset.id} className="relative group">
                  <button
                    onClick={() => openPresetModal(preset)}
                    className={`w-full ${
                      preset.name === 'Senior Game' ? 'bg-green-500 hover:bg-green-600' :
                      preset.name === 'Junior Game' ? 'bg-blue-500 hover:bg-blue-600' :
                      'bg-purple-500 hover:bg-purple-600'
                    } text-white font-bold py-4 px-6 rounded-lg flex flex-col items-center space-y-2 transition-colors`}
                  >
                    {preset.name === 'Senior Game' ? <Play className="w-6 h-6" /> :
                     preset.name === 'Junior Game' ? <Clock className="w-6 h-6" /> :
                     <Zap className="w-6 h-6" />}
                    <span className="text-lg">{preset.name}</span>
                    <span className="text-sm opacity-90">
                      {preset.periods} × {preset.periodMinutes} min{preset.hasOvertime ? ' + OT' : ''}
                    </span>
                  </button>
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPresetModal(preset);
                      }}
                      className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded shadow-sm"
                      title="Edit preset"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    {!preset.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset);
                        }}
                        className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-1 rounded shadow-sm"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setIsCreateOpen(true)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg flex flex-col items-center space-y-2 transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="text-lg">Custom Game</span>
                <span className="text-sm opacity-90">Full settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Filters Section */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden transition-all duration-200">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={toggleFilters}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFilters();
            }
          }}
          aria-expanded={isFiltersExpanded}
          aria-controls="filters-content"
        >
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Filter className="w-5 h-5 text-gray-600" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                ({activeFilterCount} active)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isFiltersExpanded ? (
              <ChevronUp 
                className="w-5 h-5 text-gray-600 transition-transform duration-200" 
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px' }}
              />
            ) : (
              <ChevronDown 
                className="w-5 h-5 text-gray-600 transition-transform duration-200" 
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px' }}
              />
            )}
          </div>
        </div>
        
        <div 
          id="filters-content"
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isFiltersExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team</label>
                <select
                  value={filters.team}
                  onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All Teams</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Season</label>
                <select
                  value={filters.season}
                  onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All Seasons</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All Statuses</option>
                  <option value="planned">Planned</option>
                  <option value="live">Live</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setFilters({ team: '', season: '', status: '', dateFrom: '', dateTo: '' })}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Season Filter Banner */}
      {seasonFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                Viewing: {seasons.find(s => s.id === seasonFilter)?.name || 'Unknown Season'}
              </span>
            </div>
            <button
              onClick={clearSeasonFilter}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* Games by Status */}
      <div className="space-y-8">
        {/* Planned Games */}
        {gamesByStatus.planned.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Planned Games ({gamesByStatus.planned.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamesByStatus.planned.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* Live Games */}
        {gamesByStatus.live.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Play className="w-5 h-5 text-green-600" />
              <span>Live Games ({gamesByStatus.live.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamesByStatus.live.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* Archived Games */}
        {gamesByStatus.archived.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Archive className="w-5 h-5 text-gray-600" />
              <span>Archived Games ({gamesByStatus.archived.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamesByStatus.archived.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}
      </div>

      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
          <p className="text-gray-500 mb-4">Create your first game to start tracking matches</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Game
          </button>
        </div>
      )}

      {/* Create Game Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Game</h3>
            <form onSubmit={handleCreateGame}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Home Team</label>
                <select
                  value={gameForm.homeTeamId}
                  onChange={(e) => setGameForm({ ...gameForm, homeTeamId: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select home team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Away Team</label>
                <input
                  type="text"
                  value={gameForm.awayTeamName}
                  onChange={(e) => setGameForm({ ...gameForm, awayTeamName: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Enter away team name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={gameForm.date}
                    onChange={(e) => setGameForm({ ...gameForm, date: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={gameForm.time}
                    onChange={(e) => setGameForm({ ...gameForm, time: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Season</label>
                <select
                  value={gameForm.seasonId}
                  onChange={(e) => setGameForm({ ...gameForm, seasonId: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select season</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Periods</label>
                  <select
                    value={gameForm.periods}
                    onChange={(e) => setGameForm({ ...gameForm, periods: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                  >
                    <option value={2}>2 Periods</option>
                    <option value={3}>3 Periods</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Minutes/Period</label>
                  <select
                    value={gameForm.periodMinutes}
                    onChange={(e) => setGameForm({ ...gameForm, periodMinutes: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={25}>25 minutes</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gameForm.hasOvertime}
                    onChange={(e) => setGameForm({ ...gameForm, hasOvertime: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Enable Overtime</span>
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Game
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Game Modal */}
      {showPresetModal && selectedPreset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{selectedPreset.name}</h2>
            <p className="text-gray-600 mb-4">
              {selectedPreset.periods} periods × {selectedPreset.periodMinutes} minutes{selectedPreset.hasOvertime ? ' + Overtime' : ''}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Opponent Name *</label>
                <input
                  type="text"
                  value={gameFromPresetForm.awayTeamName}
                  onChange={(e) => setGameFromPresetForm({ ...gameFromPresetForm, awayTeamName: e.target.value })}
                  className="w-full p-3 border rounded-lg text-lg"
                  placeholder="Enter opponent name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={gameFromPresetForm.date}
                  onChange={(e) => setGameFromPresetForm({ ...gameFromPresetForm, date: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={gameFromPresetForm.time}
                  onChange={(e) => setGameFromPresetForm({ ...gameFromPresetForm, time: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Season</label>
                <select
                  value={gameFromPresetForm.seasonId}
                  onChange={(e) => setGameFromPresetForm({ ...gameFromPresetForm, seasonId: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={createGameFromPreset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
              >
                Create Game
              </button>
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-3 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Game Modal */}
      {showEditModal && selectedGameForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Game</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Home Team</label>
                <select
                  value={gameForm.homeTeamId}
                  onChange={(e) => setGameForm({ ...gameForm, homeTeamId: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Away Team</label>
                <input
                  type="text"
                  value={gameForm.awayTeamName}
                  onChange={(e) => setGameForm({ ...gameForm, awayTeamName: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={gameForm.date}
                    onChange={(e) => setGameForm({ ...gameForm, date: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <input
                    type="time"
                    value={gameForm.time}
                    onChange={(e) => setGameForm({ ...gameForm, time: e.target.value })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Season</label>
                <select
                  value={gameForm.seasonId}
                  onChange={(e) => setGameForm({ ...gameForm, seasonId: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                >
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Periods</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={gameForm.periods}
                    onChange={(e) => setGameForm({ ...gameForm, periods: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Period Minutes</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={gameForm.periodMinutes}
                    onChange={(e) => setGameForm({ ...gameForm, periodMinutes: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={gameForm.hasOvertime}
                    onChange={(e) => setGameForm({ ...gameForm, hasOvertime: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Has Overtime</span>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={updateGame}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-3 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Preset Modal */}
      {showEditPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {presetToEdit ? `Edit ${presetToEdit.name}` : 'Create New Preset'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Preset Name *</label>
                <input
                  type="text"
                  value={presetForm.name}
                  onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Enter preset name"
                  disabled={presetToEdit?.isDefault}
                />
                {presetToEdit?.isDefault && (
                  <p className="text-xs text-gray-500 mt-1">Default preset names cannot be changed</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Periods</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={presetForm.periods}
                    onChange={(e) => setPresetForm({ ...presetForm, periods: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Minutes/Period</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={presetForm.periodMinutes}
                    onChange={(e) => setPresetForm({ ...presetForm, periodMinutes: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={presetForm.hasOvertime}
                    onChange={(e) => setPresetForm({ ...presetForm, hasOvertime: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Has Overtime</span>
                </label>
              </div>
              
              {presetForm.hasOvertime && (
                <div>
                  <label className="block text-sm font-medium mb-2">Overtime Minutes</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={presetForm.overtimeMinutes}
                    onChange={(e) => setPresetForm({ ...presetForm, overtimeMinutes: parseInt(e.target.value) || 5 })}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={presetToEdit ? savePreset : createNewPreset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
              >
                {presetToEdit ? 'Save Changes' : 'Create Preset'}
              </button>
              <button
                onClick={() => {
                  setShowEditPresetModal(false);
                  setPresetToEdit(null);
                }}
                className="px-4 py-3 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Side Selection Modal */}
      {isSideSelectionOpen && selectedGameForStart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-96">
            <h3 className="text-xl font-semibold mb-6 text-center">Team Side Selection</h3>
            <p className="text-center mb-8 text-gray-600">
              Which side does <strong>{getTeamName(selectedGameForStart.homeTeamId)}</strong> defend first?
            </p>
            
            {/* Rink diagram with side buttons */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => handleSideSelection('left')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-8 px-4 rounded-lg flex flex-col items-center space-y-2 transition-colors"
              >
                <ArrowLeft className="w-8 h-8" />
                <span className="text-lg">← LEFT</span>
              </button>
              <button
                onClick={() => handleSideSelection('right')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-8 px-4 rounded-lg flex flex-col items-center space-y-2 transition-colors"
              >
                <ArrowRight className="w-8 h-8" />
                <span className="text-lg">RIGHT →</span>
              </button>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setIsSideSelectionOpen(false);
                  setSelectedGameForStart(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
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

export default Games;