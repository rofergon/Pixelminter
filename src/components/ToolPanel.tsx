/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Paintbrush, Eraser, Trash2, Grid, RotateCcw, RotateCw, ZoomIn, ZoomOut, PaintBucket, Move, Image, Slash } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Feedback } from '../types/types';

interface ToolPanelProps {
  state: {
    color: string;
    tool: 'brush' | 'eraser' | 'bucket' | 'move' | 'line';
    showGrid: boolean;
    touchEnabled: boolean;
    showReferenceImage: boolean;
    brushSize: number;
  };
  updateState: (newState: Partial<{ tool: 'brush' | 'eraser' | 'bucket' | 'move' | 'line'; color: string; showGrid: boolean; touchEnabled: boolean; showReferenceImage: boolean; brushSize: number }>) => void;
  handleHistoryAction: (action: 'undo' | 'redo') => void;
  clearCanvas: () => void;
  handleZoom: (zoomIn: boolean) => void;
  feedback: Feedback;
  canUndo: boolean;
  canRedo: boolean;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  state, updateState, handleHistoryAction, clearCanvas, handleZoom, feedback, canUndo, canRedo
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const renderToolButton = (
    icon: React.ElementType,
    title: string,
    onClick: () => void,
    isActive: boolean = false,
    isDisabled: boolean = false
  ) => (
    <Button
      onClick={onClick}
      className={`
        w-[36px] h-[36px] p-2 relative group pixel-button retro-button
        ${feedback[title] ? 'pixel-glitch' : ''} 
        transition-all duration-200 ease-out
        ${isActive 
          ? 'bg-slate-600 text-slate-100 shadow-md border-slate-500' 
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }
        border border-slate-700 hover:border-slate-600
        rounded-lg
        hover:scale-105 hover:shadow-sm
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        backdrop-blur-sm
      `}
      title={title}
      disabled={isClient ? isDisabled : undefined}
      data-tooltip={title}
    >
      {React.createElement(icon, { 
        className: `h-4 w-4 transition-all duration-200 ${
          isActive ? 'text-slate-100' : 'group-hover:text-slate-200'
        }` 
      })}
      {isActive && (
        <div className="absolute inset-0 rounded-lg bg-slate-500/20" />
      )}
    </Button>
  );

  return (
    <div className="w-14 bg-slate-900 flex flex-col items-center py-3 space-y-1.5 border-r border-slate-700 shadow-lg">
      {/* Color Picker with Enhanced Design */}
      <div className={`relative group ${feedback['colorPicker'] ? 'scale-95' : ''} transition-all duration-200`}>
        <input
          type="color"
          value={state.color}
          onChange={(e) => updateState({ color: e.target.value })}
          className="relative w-[36px] h-[36px] p-0 border-2 border-slate-700 bg-transparent rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-sm"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
          title="Choose Color"
        />
        <div
          className="absolute inset-0 rounded-lg pointer-events-none border-2 border-slate-700 group-hover:border-slate-600 transition-colors duration-200"
          style={{
            backgroundColor: state.color,
            boxShadow: `inset 0 0 0 2px rgba(255, 255, 255, 0.1)`,
          }}
        />
      </div>

      {/* Tool Buttons */}
      {renderToolButton(Paintbrush, "brush", () => updateState({ tool: 'brush' }), state.tool === 'brush')}
      {renderToolButton(Slash, "line", () => updateState({ tool: 'line' }), state.tool === 'line')}
      {renderToolButton(PaintBucket, "bucket", () => updateState({ tool: 'bucket' }), state.tool === 'bucket')}
      {renderToolButton(Eraser, "eraser", () => updateState({ tool: 'eraser' }), state.tool === 'eraser')}
      {renderToolButton(Move, "move", () => {
        updateState({ tool: 'move', touchEnabled: !state.touchEnabled });
      }, state.tool === 'move')}
      
      {/* Separator */}
      <div className="w-6 h-px bg-slate-700 my-1" />
      
      {renderToolButton(Grid, "toggleGrid", () => updateState({ showGrid: !state.showGrid }), state.showGrid)}
      {renderToolButton(RotateCcw, "undo", () => handleHistoryAction('undo'), false, isClient && !canUndo)}
      {renderToolButton(RotateCw, "redo", () => handleHistoryAction('redo'), false, isClient && !canRedo)}
      {renderToolButton(Trash2, "clearCanvas", clearCanvas)}
      
      {/* Separator */}
      <div className="w-6 h-px bg-slate-700 my-1" />
      
      {renderToolButton(ZoomOut, "zoomOut", () => handleZoom(false))}
      {renderToolButton(ZoomIn, "zoomIn", () => handleZoom(true))}
      {renderToolButton(Image, "toggleReferenceImage", () => updateState({ showReferenceImage: !state.showReferenceImage }), state.showReferenceImage)}
      
      {/* Brush Size Controls with Enhanced Design */}
      <div className="flex flex-col items-center gap-0.5 mt-1 p-1.5 bg-slate-800 rounded-lg border border-slate-700 shadow-sm">
        <Button
          onClick={() => updateState({ brushSize: Math.min(10, state.brushSize + 1) })}
          className="w-[28px] h-[20px] p-0 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 rounded transition-all duration-150 hover:scale-105"
          title="Increase brush size"
        >
          +
        </Button>
        <div className="text-slate-300 text-xs font-mono bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600 min-w-[28px] text-center">
          {state.brushSize}
        </div>
        <Button
          onClick={() => updateState({ brushSize: Math.max(1, state.brushSize - 1) })}
          className="w-[28px] h-[20px] p-0 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 rounded transition-all duration-150 hover:scale-105"
          title="Decrease brush size"
        >
          -
        </Button>
      </div>
    </div>
  );
};

export default ToolPanel;