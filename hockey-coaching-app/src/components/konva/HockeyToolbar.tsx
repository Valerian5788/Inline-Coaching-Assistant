import React from 'react';
import {
  MousePointer2,
  Circle,
  Triangle,
  Type,
  Undo,
  Redo,
  Trash2,
  Move,
  ArrowRight,
  Target
} from 'lucide-react';

interface ToolConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  customIcon?: React.ReactNode;
  category: 'select' | 'players' | 'objects' | 'arrows' | 'actions';
  color?: string;
}

interface HockeyToolbarProps {
  selectedTool: string;
  onToolChange: (tool: string) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const TOOLS: ToolConfig[] = [
  // Selection tool
  {
    id: 'select',
    label: 'Select',
    icon: MousePointer2,
    category: 'select'
  },

  // Player tools - inline hockey specific
  {
    id: 'offense',
    label: 'Offense Player',
    category: 'players',
    customIcon: (
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
        O
      </div>
    )
  },
  {
    id: 'defense',
    label: 'Defense Player',
    category: 'players',
    customIcon: (
      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
        D
      </div>
    )
  },
  {
    id: 'opponent',
    label: 'Opponent',
    category: 'players',
    customIcon: (
      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
        X
      </div>
    )
  },
  {
    id: 'goalie',
    label: 'Goalie',
    category: 'players',
    customIcon: (
      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
        G
      </div>
    )
  },

  // Objects
  {
    id: 'puck',
    label: 'Puck',
    icon: Circle,
    category: 'objects',
    color: '#000000'
  },
  {
    id: 'cone',
    label: 'Cone',
    icon: Triangle,
    category: 'objects',
    color: '#F97316'
  },

  // Arrows - inline hockey specific
  {
    id: 'arrow',
    label: 'Movement (Forward)',
    icon: ArrowRight,
    category: 'arrows'
  },
  {
    id: 'backward_arrow',
    label: 'Backward Skating',
    category: 'arrows',
    customIcon: (
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
    )
  },
  {
    id: 'pass_arrow',
    label: 'Pass',
    category: 'arrows',
    customIcon: (
      <div className="flex items-center">
        <div className="flex gap-0.5">
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
        </div>
        <ArrowRight className="w-3 h-3 ml-1" />
      </div>
    )
  },
  {
    id: 'shoot_arrow',
    label: 'Shot',
    icon: Target,
    category: 'arrows',
    color: '#EF4444'
  },

  // Text
  {
    id: 'text',
    label: 'Text',
    icon: Type,
    category: 'objects'
  },
];

const COLORS = [
  { name: 'Blue', value: '#1E40AF' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Green', value: '#059669' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Black', value: '#000000' },
];

const HockeyToolbar: React.FC<HockeyToolbarProps> = ({
  selectedTool,
  onToolChange,
  selectedColor,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false
}) => {

  const renderTool = (tool: ToolConfig) => {
    const isSelected = selectedTool === tool.id;
    const IconComponent = tool.icon;

    return (
      <button
        key={tool.id}
        onClick={() => onToolChange(tool.id)}
        className={`
          flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
          hover:scale-105 hover:shadow-md
          ${isSelected
            ? 'bg-blue-100 border-2 border-blue-500 text-blue-700 shadow-md'
            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
          }
        `}
        title={tool.label}
      >
        {tool.customIcon ? (
          tool.customIcon
        ) : IconComponent ? (
          <IconComponent className="w-5 h-5" />
        ) : (
          <span className="text-xs font-bold">{tool.id.toUpperCase()}</span>
        )}
      </button>
    );
  };

  const groupedTools = TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolConfig[]>);

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">

          {/* Selection Tools */}
          <div className="flex gap-2">
            {groupedTools.select?.map(renderTool)}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Player Tools */}
          <div className="flex gap-2">
            {groupedTools.players?.map(renderTool)}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Objects */}
          <div className="flex gap-2">
            {groupedTools.objects?.map(renderTool)}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Arrows */}
          <div className="flex gap-2">
            {groupedTools.arrows?.map(renderTool)}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={`
                  w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110
                  ${selectedColor === color.value
                    ? 'border-gray-800 shadow-lg scale-110'
                    : 'border-gray-300 hover:border-gray-500'
                  }
                `}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                ${canUndo
                  ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:scale-105'
                  : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>

            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                ${canRedo
                  ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:scale-105'
                  : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>

            <button
              onClick={onClear}
              className="
                flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:scale-105
              "
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instruction text */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            {selectedTool === 'select' && 'Click and drag elements to move them'}
            {['offense', 'defense', 'opponent', 'goalie'].includes(selectedTool) && 'Click on the rink to place a player'}
            {selectedTool === 'puck' && 'Click to place a puck'}
            {selectedTool === 'cone' && 'Click to place a cone'}
            {['arrow', 'pass_arrow', 'shoot_arrow', 'backward_arrow'].includes(selectedTool) && 'Click and drag to draw'}
            {selectedTool === 'text' && 'Click to add text'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HockeyToolbar;