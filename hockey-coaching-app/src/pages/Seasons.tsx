import React, { useState, useEffect } from 'react';
import type { Season, SeasonType, SeasonStatus } from '../types';
import { dbHelpers } from '../db';
import { useAppStore } from '../stores/appStore';
import { Calendar, Trophy, Play, Archive, Edit2, Trash2, Plus, Crown } from 'lucide-react';

const Seasons: React.FC = () => {
  const [seasons, setSeasons] = useState<Array<Season & { gameCount: number }>>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonForm, setSeasonForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    type: 'regular' as SeasonType,
    status: 'upcoming' as SeasonStatus,
    description: ''
  });

  const { setActiveSeason, setCurrentSeason, loadActiveSeason } = useAppStore();

  useEffect(() => {
    loadSeasons();
    loadActiveSeason();
  }, []);

  const loadSeasons = async () => {
    const allSeasons = await dbHelpers.getSeasonsWithGameCounts();
    setSeasons(allSeasons);
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSeason: Season = {
      id: crypto.randomUUID(),
      name: seasonForm.name,
      startDate: seasonForm.startDate,
      endDate: seasonForm.endDate,
      type: seasonForm.type,
      status: seasonForm.status,
      description: seasonForm.description
    };

    await dbHelpers.createSeason(newSeason);
    resetForm();
    setIsCreateOpen(false);
    loadSeasons();
  };

  const handleEditSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeason) return;

    const updatedSeason = {
      name: seasonForm.name,
      startDate: seasonForm.startDate,
      endDate: seasonForm.endDate,
      type: seasonForm.type,
      status: seasonForm.status,
      description: seasonForm.description
    };

    await dbHelpers.updateSeason(editingSeason.id, updatedSeason);
    resetForm();
    setIsEditOpen(false);
    setEditingSeason(null);
    loadSeasons();
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (confirm('Are you sure you want to delete this season? This will also delete all associated games.')) {
      await dbHelpers.deleteSeason(seasonId);
      loadSeasons();
    }
  };

  const handleSetActive = async (season: Season) => {
    await dbHelpers.setActiveSeason(season.id);
    setActiveSeason(season.id);
    setCurrentSeason(season);
    loadSeasons();
  };

  const openEditModal = (season: Season & { gameCount: number }) => {
    setEditingSeason(season);
    setSeasonForm({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      type: season.type,
      status: season.status,
      description: season.description || ''
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setSeasonForm({
      name: '',
      startDate: '',
      endDate: '',
      type: 'regular',
      status: 'upcoming',
      description: ''
    });
  };

  const getStatusIcon = (status: SeasonStatus) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-600" />;
      case 'completed': return <Trophy className="w-4 h-4 text-blue-600" />;
      case 'upcoming': return <Calendar className="w-4 h-4 text-gray-600" />;
      default: return <Archive className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SeasonStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: SeasonType) => {
    switch (type) {
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'tournament': return 'bg-purple-100 text-purple-800';
      case 'playoffs': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seasons</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Season</span>
        </button>
      </div>

      {/* Seasons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seasons.map((season) => (
          <div
            key={season.id}
            className={`bg-white rounded-lg shadow-md p-6 border transition-all ${
              season.status === 'active' 
                ? 'border-green-500 shadow-lg ring-2 ring-green-100' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">{season.name}</h3>
                  {season.status === 'active' && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(season.status)} border`}>
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(season.status)}
                      <span className="capitalize">{season.status}</span>
                    </span>
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(season.type)}`}>
                    {season.type.charAt(0).toUpperCase() + season.type.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => openEditModal(season)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSeason(season.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dates */}
            <div className="text-sm text-gray-600 mb-3">
              <div>{formatDate(season.startDate)} - {formatDate(season.endDate)}</div>
            </div>

            {/* Description */}
            {season.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{season.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {season.gameCount} game{season.gameCount !== 1 ? 's' : ''}
              </span>
              {season.status !== 'active' && (
                <button
                  onClick={() => handleSetActive(season)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Set Active
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {seasons.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No seasons yet</h3>
          <p className="text-gray-500 mb-4">Create your first season to start tracking games</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Create Season
          </button>
        </div>
      )}

      {/* Create Season Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Season</h3>
            <form onSubmit={handleCreateSeason}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Season Name</label>
                <input
                  type="text"
                  value={seasonForm.name}
                  onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Spring 2024"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={seasonForm.startDate}
                    onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={seasonForm.endDate}
                    onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={seasonForm.type}
                    onChange={(e) => setSeasonForm({ ...seasonForm, type: e.target.value as SeasonType })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="regular">Regular</option>
                    <option value="tournament">Tournament</option>
                    <option value="playoffs">Playoffs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={seasonForm.status}
                    onChange={(e) => setSeasonForm({ ...seasonForm, status: e.target.value as SeasonStatus })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={seasonForm.description}
                  onChange={(e) => setSeasonForm({ ...seasonForm, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Season description..."
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Season
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

      {/* Edit Season Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Season</h3>
            <form onSubmit={handleEditSeason}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Season Name</label>
                <input
                  type="text"
                  value={seasonForm.name}
                  onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={seasonForm.startDate}
                    onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={seasonForm.endDate}
                    onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={seasonForm.type}
                    onChange={(e) => setSeasonForm({ ...seasonForm, type: e.target.value as SeasonType })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="regular">Regular</option>
                    <option value="tournament">Tournament</option>
                    <option value="playoffs">Playoffs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={seasonForm.status}
                    onChange={(e) => setSeasonForm({ ...seasonForm, status: e.target.value as SeasonStatus })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={seasonForm.description}
                  onChange={(e) => setSeasonForm({ ...seasonForm, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Season description..."
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Update Season
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingSeason(null);
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
    </div>
  );
};

export default Seasons;