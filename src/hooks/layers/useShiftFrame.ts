/* eslint-disable no-unused-vars */
import { useCallback, useEffect } from 'react';
import { State, Layer } from '../../types/types';

interface UseShiftFrameProps {
  state: State;
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  saveState: (frameIndex: number, changes: [string, string][]) => void;
  updateCanvasDisplay: () => void;
}

export const useShiftFrame = ({
  state,
  updateState,
  saveState,
  updateCanvasDisplay
}: UseShiftFrameProps) => {
  const handleShiftFrame = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const currentFrame = state.frames[state.currentFrameIndex];
    const gridSize = state.gridSize;
    const activeLayerId = state.activeLayerId;

    const shiftPixel = (x: number, y: number): [number, number] => {
      switch (direction) {
        case 'left': return [(x - 1 + gridSize) % gridSize, y];
        case 'right': return [(x + 1) % gridSize, y];
        case 'up': return [x, (y - 1 + gridSize) % gridSize];
        case 'down': return [x, (y + 1) % gridSize];
      }
    };

    updateState(prevState => {
      const updatedLayers = currentFrame.layers.map((layer: Layer) => {
        if (layer.id !== activeLayerId) {
          return layer; // No modificar capas inactivas
        }
        const newPixels = new Map<string, string>();
        layer.pixels.forEach((color, key) => {
          const [x, y] = key.split(',').map(Number);
          const [newX, newY] = shiftPixel(x, y);
          const newKey = `${newX},${newY}`;
          newPixels.set(newKey, color);
        });
        return { ...layer, pixels: newPixels };
      });

      const newFrames = [...prevState.frames];
      newFrames[prevState.currentFrameIndex] = { ...currentFrame, layers: updatedLayers };

      return { frames: newFrames };
    });

    // Crear una lista de cambios solo para la capa activa
    const activeLayer = currentFrame.layers.find(layer => layer.id === activeLayerId);
    const allChanges: [string, string][] = [];
    if (activeLayer) {
      activeLayer.pixels.forEach((color, key) => {
        const [x, y] = key.split(',').map(Number);
        const [newX, newY] = shiftPixel(x, y);
        const newKey = `${newX},${newY}`;
        allChanges.push([newKey, color]);
      });
    }

    saveState(state.currentFrameIndex, allChanges);
    updateCanvasDisplay();
  }, [state, updateState, saveState, updateCanvasDisplay]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        handleShiftFrame('left');
        break;
      case 'ArrowRight':
        handleShiftFrame('right');
        break;
      case 'ArrowUp':
        handleShiftFrame('up');
        break;
      case 'ArrowDown':
        handleShiftFrame('down');
        break;
    }
  }, [handleShiftFrame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { handleShiftFrame };
};

export default useShiftFrame;