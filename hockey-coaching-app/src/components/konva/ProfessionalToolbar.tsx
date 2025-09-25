import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  ArrowRight,
  Zap,
  Circle,
  Triangle,
  Undo,
  Redo,
  Trash,
  Download,
  Eraser
} from 'lucide-react';
import type { DrawingMode } from './ProfessionalHockeyCanvas';

interface ToolButtonProps {
  icon?: React.ComponentType<{ className?: string }>;
  customIcon?: React.ReactNode;
  mode?: DrawingMode;
  color?: string;
  isActive?: boolean;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon: Icon,
  customIcon,
  isActive = false,
  onClick,
  title,
  disabled = false,
  color
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200
        hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
        ${isActive
          ? 'bg-blue-100 border-2 border-blue-500 text-blue-700 shadow-md'
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }
      `}
      style={color ? { color } : undefined}
    >
      {customIcon ? customIcon : Icon && <Icon className="w-5 h-5" />}
    </button>
  );
};

interface ToolGroupProps {
  title: string;
  children: React.ReactNode;
}

const ToolGroup: React.FC<ToolGroupProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </span>
      <div className="flex gap-2">
        {children}
      </div>
    </div>
  );
};

interface ProfessionalToolbarProps {
  mode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  onExport?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const ProfessionalToolbar: React.FC<ProfessionalToolbarProps> = ({
  mode,
  onModeChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  canUndo = false,
  canRedo = false
}) => {

  const playerIcons = {
    offense: (
      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
        O
      </div>
    ),
    defense: (
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
        D
      </div>
    ),
    opponent: (
      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
        X
      </div>
    ),
    goalie: (
      <div className="w-6 h-6 rounded-sm bg-yellow-500 flex items-center justify-center text-black text-xs font-bold">
        G
      </div>
    )
  };

  const backwardSkatingIcon = (
    <div className="relative w-5 h-3">
      <svg viewBox="0 0 20 12" className="w-full h-full text-current">
        <path
          d="M2 6 Q4 3, 6 6 T10 6 Q12 3, 14 6 T18 6"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M15 4 L18 6 L15 8"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
    </div>
  );

  const passIcon = (
    <div className="flex items-center">
      <div className="flex gap-0.5">
        <div className="w-1 h-0.5 bg-current rounded-sm"></div>
        <div className="w-1 h-0.5 bg-current rounded-sm"></div>
        <div className="w-1 h-0.5 bg-current rounded-sm"></div>
      </div>
      <ArrowRight className="w-3 h-3 ml-1" />
    </div>
  );

  const puckCarryIcon = (
    <div className="flex items-center">
      <div className="w-2 h-2 bg-current rounded-full"></div>
      <div className="flex gap-0.5 ml-1">
        <div className="w-0.5 h-0.5 bg-current rounded-sm"></div>
        <div className="w-0.5 h-0.5 bg-current rounded-sm"></div>
        <div className="w-0.5 h-0.5 bg-current rounded-sm"></div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-end gap-6">

          {/* Selection Tools */}
          <ToolGroup title="Tools">
            <ToolButton
              icon={MousePointer2}
              mode="select"
              isActive={mode === 'select'}
              onClick={() => onModeChange('select')}
              title="Select & Move (V)"
            />
            <ToolButton
              icon={Eraser}
              mode="erase"
              isActive={mode === 'erase'}
              onClick={() => onModeChange('erase')}
              title="Erase (E)"
            />
          </ToolGroup>

          {/* Drawing Tools */}
          <ToolGroup title="Movement">
            <ToolButton
              icon={TrendingUp}
              mode="skating"
              isActive={mode === 'skating'}
              onClick={() => onModeChange('skating')}
              title="Forward Skating (D)"
              color="#2563EB"
            />
            <ToolButton
              customIcon={backwardSkatingIcon}
              mode="backward"
              isActive={mode === 'backward'}
              onClick={() => onModeChange('backward')}
              title="Backward Skating"
              color="#7C3AED"
            />
            <ToolButton
              customIcon={puckCarryIcon}
              mode="carry"
              isActive={mode === 'carry'}
              onClick={() => onModeChange('carry')}
              title="Puck Carry"
              color="#000000"
            />
          </ToolGroup>

          {/* Tactical Actions */}
          <ToolGroup title="Actions">
            <ToolButton
              customIcon={passIcon}
              mode="passing"
              isActive={mode === 'passing'}
              onClick={() => onModeChange('passing')}
              title="Pass (P)"
              color="#10B981"
            />
            <ToolButton
              icon={Zap}
              mode="shooting"
              isActive={mode === 'shooting'}
              onClick={() => onModeChange('shooting')}
              title="Shot (S)"
              color="#DC2626"
            />
          </ToolGroup>

          {/* Players */}
          <ToolGroup title="Players">
            <ToolButton
              customIcon={playerIcons.offense}
              mode="player_offense"
              isActive={mode === 'player_offense'}
              onClick={() => onModeChange('player_offense')}
              title="Offense Player"
            />
            <ToolButton
              customIcon={playerIcons.defense}
              mode="player_defense"
              isActive={mode === 'player_defense'}
              onClick={() => onModeChange('player_defense')}
              title="Defense Player"
            />
            <ToolButton
              customIcon={playerIcons.opponent}
              mode="player_opponent"
              isActive={mode === 'player_opponent'}
              onClick={() => onModeChange('player_opponent')}
              title="Opponent"
            />
            <ToolButton
              customIcon={playerIcons.goalie}
              mode="player_goalie"
              isActive={mode === 'player_goalie'}
              onClick={() => onModeChange('player_goalie')}
              title="Goalie"
            />
          </ToolGroup>

          {/* Objects */}
          <ToolGroup title="Objects">
            <ToolButton
              icon={Circle}
              mode="puck"
              isActive={mode === 'puck'}
              onClick={() => onModeChange('puck')}
              title="Puck"
              color="#000000"
            />
            <ToolButton
              icon={Triangle}
              mode="cone"
              isActive={mode === 'cone'}
              onClick={() => onModeChange('cone')}
              title="Cone"
              color="#FF6600"
            />
          </ToolGroup>

          {/* Actions */}
          <ToolGroup title="Edit">
            <ToolButton
              icon={Undo}
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            />
            <ToolButton
              icon={Redo}
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            />
            <ToolButton
              icon={Trash}
              onClick={onClear}
              title="Clear All"
              color="#DC2626"
            />
            <ToolButton
              icon={Download}
              onClick={onExport}
              title="Export (Ctrl+E)"
              color="#059669"
            />
          </ToolGroup>
        </div>

        {/* Mode Indicator */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {mode === 'select' && 'Click and drag to select and move objects'}
            {mode === 'skating' && 'Draw curved skating patterns by dragging'}
            {mode === 'backward' && 'Draw backward skating movements'}
            {mode === 'carry' && 'Draw puck carrying paths'}
            {mode === 'passing' && 'Draw passing lines between players'}
            {mode === 'shooting' && 'Draw shooting arrows'}
            {mode.startsWith('player_') && 'Click to place players on the rink'}
            {mode === 'puck' && 'Click to place pucks'}
            {mode === 'cone' && 'Click to place training cones'}
            {mode === 'erase' && 'Click objects to delete them'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalToolbar;