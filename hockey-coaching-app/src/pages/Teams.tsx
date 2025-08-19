import React, { useState, useEffect } from 'react';
import type { Team, Player, Position } from '../types';
import { dbHelpers } from '../db';
import { useAppStore } from '../stores/appStore';

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeamLocal] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreatePlayerOpen, setIsCreatePlayerOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', shortName: '', color: '#3B82F6' });
  const [playerForm, setPlayerForm] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    position: 'F' as Position
  });

  const { setSelectedTeam } = useAppStore();

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadPlayers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    const allTeams = await dbHelpers.getAllTeams();
    setTeams(allTeams);
  };

  const loadPlayers = async (teamId: string) => {
    const teamPlayers = await dbHelpers.getPlayersByTeam(teamId);
    setPlayers(teamPlayers);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: teamForm.name,
      shortName: teamForm.shortName,
      color: teamForm.color,
      players: []
    };

    await dbHelpers.createTeam(newTeam);
    setTeamForm({ name: '', shortName: '', color: '#3B82F6' });
    setIsCreateTeamOpen(false);
    loadTeams();
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      firstName: playerForm.firstName,
      lastName: playerForm.lastName,
      jerseyNumber: parseInt(playerForm.jerseyNumber),
      position: playerForm.position,
      teamId: selectedTeam.id
    };

    await dbHelpers.createPlayer(newPlayer);
    setPlayerForm({ firstName: '', lastName: '', jerseyNumber: '', position: 'F' });
    setIsCreatePlayerOpen(false);
    loadPlayers(selectedTeam.id);
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeamLocal(team);
    setSelectedTeam(team);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <button
          onClick={() => setIsCreateTeamOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Teams</h2>
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTeam?.id === team.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <div>
                    <h3 className="font-semibold">{team.name}</h3>
                    <p className="text-sm text-gray-600">{team.shortName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Players List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Players {selectedTeam && `- ${selectedTeam.name}`}
            </h2>
            {selectedTeam && (
              <button
                onClick={() => setIsCreatePlayerOpen(true)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Player
              </button>
            )}
          </div>

          {selectedTeam ? (
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        #{player.jerseyNumber} {player.firstName} {player.lastName}
                      </span>
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded">
                        {player.position}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Select a team to view players</p>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Short Name</label>
                <input
                  type="text"
                  value={teamForm.shortName}
                  onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value })}
                  className="w-full p-2 border rounded"
                  maxLength={4}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Team Color</label>
                <input
                  type="color"
                  value={teamForm.color}
                  onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                  className="w-full p-2 border rounded h-10"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Player Modal */}
      {isCreatePlayerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Player</h3>
            <form onSubmit={handleCreatePlayer}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">First Name</label>
                <input
                  type="text"
                  value={playerForm.firstName}
                  onChange={(e) => setPlayerForm({ ...playerForm, firstName: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <input
                  type="text"
                  value={playerForm.lastName}
                  onChange={(e) => setPlayerForm({ ...playerForm, lastName: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Jersey Number</label>
                <input
                  type="number"
                  value={playerForm.jerseyNumber}
                  onChange={(e) => setPlayerForm({ ...playerForm, jerseyNumber: e.target.value })}
                  className="w-full p-2 border rounded"
                  min="1"
                  max="99"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Position</label>
                <select
                  value={playerForm.position}
                  onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value as Position })}
                  className="w-full p-2 border rounded"
                >
                  <option value="F">Forward</option>
                  <option value="D">Defense</option>
                  <option value="G">Goalie</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Add Player
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatePlayerOpen(false)}
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

export default Teams;