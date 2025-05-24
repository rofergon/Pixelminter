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
      className={`w-[35px] h-[35px] p-[9px] relative ${feedback[title] ? 'scale-100' : ''} transition-all duration-200 ${
        isActive ? 'bg-primary text-primary-foreground ring-2 ring-blue-500 ring-opacity-50' : 'bg-[#1f2a37] text-[#6b7280]'
      }`}
      title={title}
      disabled={isClient ? isDisabled : undefined}
    >
      {React.createElement(icon, { className: `h-full w-full ${isActive ? 'text-blue-550' : ''}` })}
    </Button>
  );

  return (
    <div className="w-12 bg-gray-900 flex flex-col items-center py-3 space-y-1.5 border-r border-gray-800">
      <div className={`relative ${feedback['colorPicker'] ? 'scale-95' : ''} transition-all duration-200`}>
        <input
          type="color"
          value={state.color}
          onChange={(e) => updateState({ color: e.target.value })}
          className="w-[35px] h-[35px] p-0 border-2 border-gray-600 bg-transparent rounded-full cursor-pointer transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
          title="Choose Color"
        />
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            backgroundColor: state.color,
            boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
          }}
        />
      </div>
      {renderToolButton(Paintbrush, "brush", () => updateState({ tool: 'brush' }), state.tool === 'brush')}
      {renderToolButton(Slash, "line", () => updateState({ tool: 'line' }), state.tool === 'line')}
      {renderToolButton(PaintBucket, "bucket", () => updateState({ tool: 'bucket' }), state.tool === 'bucket')}
      {renderToolButton(Eraser, "eraser", () => updateState({ tool: 'eraser' }), state.tool === 'eraser')}
      {renderToolButton(Move, "move", () => {
        updateState({ tool: 'move', touchEnabled: !state.touchEnabled });
      }, state.tool === 'move')}
      {renderToolButton(Grid, "toggleGrid", () => updateState({ showGrid: !state.showGrid }), state.showGrid)}
      {renderToolButton(RotateCcw, "undo", () => handleHistoryAction('undo'), false, isClient && !canUndo)}
      {renderToolButton(RotateCw, "redo", () => handleHistoryAction('redo'), false, isClient && !canRedo)}
      {renderToolButton(Trash2, "clearCanvas", clearCanvas)}
      {renderToolButton(ZoomOut, "zoomOut", () => handleZoom(false))}
      {renderToolButton(ZoomIn, "zoomIn", () => handleZoom(true))}
      {renderToolButton(Image, "toggleReferenceImage", () => updateState({ showReferenceImage: !state.showReferenceImage }), state.showReferenceImage)}
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={() => updateState({ brushSize: Math.min(10, state.brushSize + 1) })}
          className="w-[35px] h-[20px] p-0 text-xs"
          title="Increase brush size"
        >
          +
        </Button>
        <div className="text-white text-xs">{state.brushSize}px</div>
        <Button
          onClick={() => updateState({ brushSize: Math.max(1, state.brushSize - 1) })}
          className="w-[35px] h-[20px] p-0 text-xs"
          title="Decrease brush size"
        >
          -
        </Button>
      </div>
    </div>
  );
};

export default ToolPanel;