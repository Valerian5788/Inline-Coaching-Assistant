import React from 'react';
import { 
  MousePointer2, 
  ArrowRight, 
  Minus, 
  ArrowUpLeft,
  Circle,
  Target,
  Triangle,
  Type,
  Undo,
  Redo,
  RotateCcw
} from 'lucide-react';
import type { DrawingToolType, DrawingColor } from '../types';

interface ProfessionalToolbarProps {
  selectedTool: DrawingToolType;
  selectedColor: DrawingColor;
  onToolChange: (tool: DrawingToolType) => void;
  onColorChange: (color: DrawingColor) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

interface ToolConfig {
  id: DrawingToolType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  customIcon?: React.ReactNode;
}

const TOOLS: ToolConfig[] = [
  { 
    id: 'pointer', 
    icon: MousePointer2, 
    label: 'Select' 
  },
  { 
    id: 'arrow', 
    icon: ArrowRight, 
    label: 'Movement' 
  },
  { 
    id: 'pass_arrow', 
    icon: Minus, 
    label: 'Pass',
    customIcon: (
      <div className="relative w-5 h-3 flex items-center">
        {/* Clean dashed line */}
        <div className="flex items-center gap-0.5 w-4">
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
          <div className="w-1 h-0.5 bg-current rounded-sm"></div>
        </div>
        {/* Arrow tip */}
        <div className="w-0 h-0 border-l-[3px] border-l-current border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
      </div>
    )
  },
  { 
    id: 'backward_arrow', 
    icon: ArrowUpLeft, 
    label: 'Backward',
    customIcon: (
      <div className="relative w-5 h-3">
        {/* Wavy/squiggly line like in reference */}
        <svg viewBox="0 0 20 12" className="w-full h-full text-current">
          <path 
            d="M2 6 Q4 3, 6 6 T10 6 Q12 3, 14 6 T18 6" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            fill="none"
          />
          {/* Arrow tip */}
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
    id: 'shoot_arrow', 
    icon: Target, 
    label: 'Shoot',
    customIcon: (
      <div className="relative w-5 h-3 flex items-center">
        {/* Two parallel lines like reference */}
        <div className="relative">
          <div className="w-4 h-0.5 bg-current mb-0.5 rounded-sm"></div>
          <div className="w-4 h-0.5 bg-current rounded-sm"></div>
        </div>
        {/* Single arrow tip */}
        <div className="ml-0.5 w-0 h-0 border-l-[3px] border-l-current border-t-[2.5px] border-t-transparent border-b-[2.5px] border-b-transparent"></div>
      </div>
    )
  },
  { 
    id: 'puck', 
    icon: Circle, 
    label: 'Puck',
    customIcon: (
      <div className="w-2 h-2 bg-current rounded-full"></div>
    )
  },
  { 
    id: 'defense', 
    icon: Circle, 
    label: 'Defense',
    customIcon: (
      <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
        D
      </div>
    )
  },
  { 
    id: 'offense', 
    icon: Circle, 
    label: 'Offense',
    customIcon: (
      <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
        O
      </div>
    )
  },
  { 
    id: 'opponent', 
    icon: Circle, 
    label: 'Opponent',
    customIcon: (
      <div className="relative w-6 h-6 flex items-center justify-center">
        <div className="absolute w-4 h-0.5 bg-current transform rotate-45"></div>
        <div className="absolute w-4 h-0.5 bg-current transform -rotate-45"></div>
      </div>
    )
  },
  { 
    id: 'cone', 
    icon: Triangle, 
    label: 'Cone'
  },
  { 
    id: 'text', 
    icon: Type, 
    label: 'Text'
  }
];

const COLOR_OPTIONS: { color: DrawingColor; hex: string; label: string }[] = [
  { color: 'blue', hex: '#2563eb', label: 'Blue' },
  { color: 'red', hex: '#dc2626', label: 'Red' },
  { color: 'black', hex: '#000000', label: 'Black' },
  { color: 'yellow', hex: '#eab308', label: 'Yellow' }
];

export const ProfessionalToolbar: React.FC<ProfessionalToolbarProps> = ({
  selectedTool,
  selectedColor,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false
}) => {
  const ToolButton: React.FC<{ tool: ToolConfig; isActive: boolean }> = ({ tool, isActive }) => (
    <button
      onClick={() => onToolChange(tool.id)}
      className={`
        w-12 h-12 rounded-lg flex items-center justify-center transition-all
        ${isActive
          ? 'bg-blue-500 text-white shadow-lg scale-105'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm'
        }
      `}
      title={tool.label}
    >
      {tool.customIcon || <tool.icon className="w-5 h-5" />}
    </button>
  );

  const ColorButton: React.FC<{ color: DrawingColor; hex: string; label: string; isActive: boolean }> = ({
    color,
    hex,
    label,
    isActive
  }) => (
    <button
      onClick={() => onColorChange(color)}
      className={`
        w-8 h-8 rounded-full transition-all border-2
        ${isActive 
          ? 'border-gray-800 scale-110 shadow-lg' 
          : 'border-white shadow-sm hover:scale-105'
        }
      `}
      style={{ backgroundColor: hex }}
      title={label}
      aria-label={label}
    />
  );

  const ActionButton: React.FC<{
    onClick?: () => void;
    disabled?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }> = ({ onClick, disabled, icon: Icon, label }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-10 h-10 rounded-lg flex items-center justify-center transition-all
        ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm hover:shadow-md'
        }
      `}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-50 rounded-2xl p-4 shadow-2xl border border-gray-200">
        <div className="flex items-center gap-4">
          {/* Drawing Tools */}
          <div className="flex items-center gap-2">
            {TOOLS.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={selectedTool === tool.id}
              />
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-300"></div>

          {/* Color Palette */}
          <div className="flex items-center gap-2">
            {COLOR_OPTIONS.map((colorOption) => (
              <ColorButton
                key={colorOption.color}
                color={colorOption.color}
                hex={colorOption.hex}
                label={colorOption.label}
                isActive={selectedColor === colorOption.color}
              />
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-300"></div>

          {/* Action Tools */}
          <div className="flex items-center gap-1">
            {onUndo && (
              <ActionButton
                onClick={onUndo}
                disabled={!canUndo}
                icon={Undo}
                label="Undo"
              />
            )}
            {onRedo && (
              <ActionButton
                onClick={onRedo}
                disabled={!canRedo}
                icon={Redo}
                label="Redo"
              />
            )}
            {onClear && (
              <ActionButton
                onClick={onClear}
                icon={RotateCcw}
                label="Clear All"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalToolbar;