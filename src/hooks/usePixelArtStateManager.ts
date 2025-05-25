/* eslint-disable no-unused-vars */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { State, Frame, Layer, HistoryEntry } from '../types/types';
import { loadStateFromCache } from './useCacheState';
import * as LayerManager from './layers/layerStateManager';
import { v4 as uuidv4 } from 'uuid';
import { calculateDay } from './useDateUtils';

const usePixelArtStateManager = () => {
  const canvasSize = 1280;
  const cachedState = useMemo(loadStateFromCache, []);

  const initialState: State = useMemo(() => {
    const defaultLayer: Layer = { id: uuidv4(), name: 'Layer 1', pixels: new Map(), visible: true, opacity: 1 };
    const defaultFrame: Frame = { layers: [defaultLayer], history: [], historyIndex: -1 };
    const gridSize = 16;

    if (cachedState) {
      return {
        ...cachedState,
        canvasSize,
        frames: cachedState.frames.length > 0 ? cachedState.frames : [defaultFrame],
        currentFrameIndex: Math.min(cachedState.currentFrameIndex, cachedState.frames.length - 1),
        gridSize: cachedState.gridSize || gridSize,
        touchEnabled: cachedState.touchEnabled || false,
        activeLayerId: cachedState.activeLayerId || defaultLayer.id,
        brushData: cachedState.brushData || null,
        pixelsPerDay: cachedState.pixelsPerDay || 0,
        day: null,
        onionSkinning: false,
        onionSkinningOpacity: 0.5,
        backgroundOpacity: cachedState.backgroundOpacity || 1,
        showReferenceImage: cachedState.showReferenceImage || false,
        referenceImageUrl: cachedState.referenceImageUrl || '',
        referenceImagePosition: cachedState.referenceImagePosition || { x: 0, y: 0 },
        referenceImageSize: cachedState.referenceImageSize || { width: 340, height: 460 },
        fps: cachedState.fps || 30, // Añadimos esta línea
        brushSize: 1, // Valor inicial para el tamaño del pincel
      };
    }

    return {
      showBackgroundImage: true,
      color: '#000000',
      isDrawing: false,
      tool: 'brush',
      canvasSize,
      gridSize,
      showGrid: true,
      scale: 1,
      palette: [],
      theme: '',
      dailyImageUrl: '',
      isPaletteLoading: false,
      frames: [defaultFrame],
      currentFrameIndex: 0,
      zoom: 0.8,
      activeTab: 'draw',
      customPalette: [],
      touchEnabled: false,
      activeLayerId: defaultLayer.id,
      brushData: null,
      pixelsPerDay: 0,
      day: null,
      onionSkinning: false,
      onionSkinningOpacity: 0.5,
      backgroundOpacity: 1,
      showReferenceImage: false,
      referenceImageUrl: '',
      referenceImagePosition: { x: 0, y: 0 },
      referenceImageSize: { width: 340, height: 460 },
      fps: 30, // Valor inicial para FPS
      brushSize: 1, // Valor inicial para el tamaño del pincel
    };
  }, [cachedState, canvasSize]);

  const [state, setState] = useState<State>(initialState);

  const updateState = useCallback((newState: Partial<State> | ((prev: State) => Partial<State>)) => {
    setState(prev => {
      const updatedState = { ...prev, ...(typeof newState === 'function' ? newState(prev) : newState) };
      return updatedState;
    });
  }, []);

  const updateFrames = useCallback((updater: (frames: Frame[]) => Frame[]) => {
    updateState(prev => ({ frames: updater(prev.frames) }));
  }, [updateState]);

  const updateCurrentFrame = useCallback((updater: (frame: Frame) => Frame) => {
    updateFrames(frames => frames.map((frame, index) => index === state.currentFrameIndex ? updater(frame) : frame));
  }, [updateFrames, state.currentFrameIndex]);

  const layerActions = useMemo(() => ({
    addLayer: () => updateState(prev => LayerManager.addLayer(prev)),
    removeLayer: (layerId: string) => updateState(prev => LayerManager.removeLayer(prev, layerId)),
    updateLayerVisibility: (layerId: string, visible: boolean) => updateState(prev => LayerManager.updateLayerVisibility(prev, layerId, visible)),
    updateLayerOpacity: (layerId: string, opacity: number) => updateState(prev => LayerManager.updateLayerOpacity(prev, layerId, opacity)),
    setActiveLayerId: (layerId: string) => updateState({ activeLayerId: layerId }),
    updateLayerName: (layerId: string, newName: string) => {
      updateState(prev => {
        const frames = [...prev.frames];
        const layerIndex = frames[prev.currentFrameIndex].layers.findIndex(layer => layer.id === layerId);
        if (layerIndex !== -1) {
          frames[prev.currentFrameIndex].layers[layerIndex].name = newName;
        }
        return { frames };
      });
    },
    reorderLayers: (sourceIndex: number, targetIndex: number) => 
      updateState(prev => LayerManager.reorderLayers(prev, sourceIndex, targetIndex)),
  }), [updateState]);

  const pixelActions = useMemo(() => ({
    updatePixel: (x: number, y: number, color: string | null) => {
      updateCurrentFrame(frame => {
        const updatedFrame = {
          ...frame,
          layers: frame.layers.map(layer => {
            if (layer.id === state.activeLayerId) {
              const newPixels = new Map(layer.pixels);
              const key = `${x},${y}`;
              
              if (color === null) {
                newPixels.delete(key);
              } else {
                newPixels.set(key, color);
              }
              
              return { ...layer, pixels: newPixels };
            }
            return layer;
          })
        };

        return updatedFrame;
      });
    },
    saveState: (frameIndex: number, changes?: [string, string][]) => {
      if (!changes?.length) return;
      updateFrames(frames => frames.map((frame, index) =>
        index === frameIndex ? {
          ...frame,
          history: [...frame.history.slice(0, frame.historyIndex + 1), { frameIndex, layerId: state.activeLayerId, changes, type: 'pixel' }],
          historyIndex: frame.historyIndex + 1
        } : frame
      ));
    },
    undo: () => {
      updateCurrentFrame(frame => {
        if (frame.historyIndex < 0 || !frame.history.length) return frame;
        
        const entry = frame.history[frame.historyIndex];
        if (!entry) return frame;
        
        return {
          ...frame,
          layers: frame.layers.map(layer => {
            if (layer.id === entry.layerId) {
              if (entry.type === 'clear') {
                const newPixels = new Map();
                entry.changes.forEach(([key, color]) => {
                  newPixels.set(key, color);
                });
                return { ...layer, pixels: newPixels };
              } else {
                return { ...layer, pixels: undoPixelChanges(layer.pixels, entry.changes, frame.history, frame.historyIndex - 1) };
              }
            }
            return layer;
          }),
          historyIndex: frame.historyIndex - 1
        };
      });
    },
    redo: () => {
      updateCurrentFrame(frame => {
        if (frame.historyIndex >= frame.history.length - 1) return frame;
        const entry = frame.history[frame.historyIndex + 1];
        
        return {
          ...frame,
          layers: frame.layers.map(layer =>
            layer.id === entry.layerId
              ? { ...layer, pixels: redoPixelChanges(layer.pixels, entry.changes) }
              : layer
          ),
          historyIndex: frame.historyIndex + 1
        };
      });
    },
    clearCanvas: () => {
      updateCurrentFrame(frame => {
        const pixelsToSave: [string, string][] = [];
        frame.layers.forEach(layer => {
          layer.pixels.forEach((color, key) => {
            pixelsToSave.push([key, color]);
          });
        });

        const historyEntry: HistoryEntry = {
          frameIndex: state.currentFrameIndex,
          layerId: state.activeLayerId,
          changes: pixelsToSave,
          type: 'clear' as const
        };

        const updatedHistory = [
          ...frame.history.slice(0, frame.historyIndex + 1),
          historyEntry
        ];

        return {
          ...frame,
          layers: frame.layers.map(layer => ({ ...layer, pixels: new Map() })),
          history: updatedHistory,
          historyIndex: updatedHistory.length - 1
        };
      });
    },
    syncPixelGrid: () => {
      updateState(prev => {
        const currentFrame = prev.frames[prev.currentFrameIndex];
        const updatedLayers = currentFrame.layers.map(layer => layer.visible ? { ...layer, pixels: new Map(layer.pixels) } : layer);
        const frames = prev.frames.map((frame, index) => index === prev.currentFrameIndex ? { ...frame, layers: updatedLayers } : frame);
        return { frames };
      });
    },
  }), [updateCurrentFrame, updateFrames, updateState, state]);

  const fpsActions = useMemo(() => ({
    setFps: (newFps: number) => updateState({ fps: newFps }),
  }), [updateState]);

  const syncPixelGridWithCurrentFrame = () => {
    // Implementa la lógica necesaria
  };

  const canUndo = useMemo(() => state.frames[state.currentFrameIndex].historyIndex >= 0, [state.frames, state.currentFrameIndex]);
  const canRedo = useMemo(() => state.frames[state.currentFrameIndex].historyIndex < state.frames[state.currentFrameIndex].history.length - 1, [state.frames, state.currentFrameIndex]);

  const updateDay = useCallback(async () => {
    try {
      const calculatedDay = await calculateDay();
      updateState({ day: calculatedDay });
    } catch (error) {
      console.error('Error al calcular el día:', error);
    }
  }, [updateState]);

  const toggleOnionSkinning = useCallback(() => {
    updateState(prevState => ({ onionSkinning: !prevState.onionSkinning }));
  }, [updateState]);

  const updateOnionSkinningOpacity = useCallback((opacity: number) => {
    updateState({ onionSkinningOpacity: opacity });
  }, [updateState]);

  useEffect(() => {
    updateDay();
  }, [updateDay]);

  const reorderLayers = useCallback((sourceIndex: number, targetIndex: number) => {
    updateState(prev => LayerManager.reorderLayers(prev, sourceIndex, targetIndex));
  }, [updateState]);

  return {
    state,
    updateState,
    ...layerActions,
    ...pixelActions,
    ...fpsActions, // Añadimos las acciones de FPS
    canUndo,
    canRedo,
    syncPixelGridWithCurrentFrame,
    updateDay,
    toggleOnionSkinning,
    updateOnionSkinningOpacity,
    reorderLayers,
  };
};

// Funciones auxiliares
const updatePixelMap = (pixels: Map<string, string>, x: number, y: number, color: string | null) => {
  const newPixels = new Map(pixels);
  const key = `${x},${y}`;
  color ? newPixels.set(key, color) : newPixels.delete(key);
  return newPixels;
};

const undoPixelChanges = (pixels: Map<string, string>, changes: [string, string][], history: HistoryEntry[], historyIndex: number) => {
  const newPixels = new Map(pixels);
  changes.forEach(([key]) => {
    const prevColor = findPreviousColor(history, historyIndex, key);
    prevColor ? newPixels.set(key, prevColor) : newPixels.delete(key);
  });
  return newPixels;
};

const redoPixelChanges = (pixels: Map<string, string>, changes: [string, string][]) => {
  const newPixels = new Map(pixels);
  changes.forEach(([key, color]) => {
    color ? newPixels.set(key, color) : newPixels.delete(key);
  });
  return newPixels;
};

const findPreviousColor = (history: HistoryEntry[], currentIndex: number, key: string): string | null => {
  for (let i = currentIndex; i >= 0; i--) {
    const change = history[i].changes.find(([k]) => k === key);
    if (change) return change[1];
  }
  return null;
};

export default usePixelArtStateManager;