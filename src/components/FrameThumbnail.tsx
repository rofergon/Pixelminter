/* eslint-disable no-unused-vars */
import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { State, Frame, Layer } from '../types/types';

interface FrameThumbnailProps {
  frame: Frame;
  index: number;
  state: State;
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  onDelete: () => void;
  canDelete: boolean;
  onFrameSelect: (index: number) => void;
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({ 
  frame, 
  index, 
  state, 
  onDelete, 
  canDelete,
  onFrameSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const cellSize = 64 / state.gridSize;
        ctx.clearRect(0, 0, 64, 64);

        frame.layers.forEach((layer: Layer) => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            
            // Manejar diferentes tipos de estructuras de datos para layer.pixels
            if (layer.pixels instanceof Map) {
              layer.pixels.forEach((color, key) => {
                const [x, y] = key.split(',').map(Number);
                ctx.fillStyle = color;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
              });
            } else if (typeof layer.pixels === 'object' && layer.pixels !== null) {
              Object.entries(layer.pixels).forEach(([key, color]) => {
                const [x, y] = key.split(',').map(Number);
                ctx.fillStyle = color as string;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
              });
            }
          }
        });

        ctx.globalAlpha = 1;
      }
    }
  }, [frame, state.gridSize]);

  const handleFrameClick = () => {
    onFrameSelect(index);
  };

  return (
    <div
      className={`inline-block relative mr-2 ${index === state.currentFrameIndex ? 'border-2 border-blue-500' : ''}`}
      onClick={handleFrameClick}
    >
      <canvas ref={canvasRef} className="w-16 h-16 object-cover cursor-pointer" />
      {canDelete && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          variant="destructive"
          size="sm"
          className="absolute top-0 right-0 h-6 w-6 p-0 rounded-full"
        >
          X
        </Button>
      )}
    </div>
  );
};

export default FrameThumbnail;