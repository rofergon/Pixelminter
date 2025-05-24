/* eslint-disable no-unused-vars */
import { useReducer, useRef, useCallback, useMemo } from 'react';
import { State, Layer } from '../types/types';
import { MAX_HISTORY_ENTRIES } from './useCacheState';

interface HistoryEntry {
  frameIndex: number;
  layerId: string;
  changes: [string, string][];
  type: 'pixel' | 'layer';
}

type Action =
  | { type: 'UPDATE_STATE'; payload: Partial<State> | ((prev: State) => Partial<State>) }
  | { type: 'UPDATE_PIXEL'; payload: { x: number; y: number; color: string | null } }
  | { type: 'SAVE_STATE'; payload: { frameIndex: number; changes?: [string, string][]; layerId?: string; type?: 'pixel' | 'layer' } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'ADD_LAYER' }
  | { type: 'REMOVE_LAYER'; payload: string }
  | { type: 'UPDATE_LAYER_VISIBILITY'; payload: { layerId: string; visible: boolean } }
  | { type: 'UPDATE_LAYER_OPACITY'; payload: { layerId: string; opacity: number } }
  | { type: 'SET_ACTIVE_LAYER'; payload: string };

const initialStateSetup = (initialState: State): State => ({
  ...initialState,
  frames: initialState.frames.length
    ? initialState.frames
    : [{
        layers: [{
          id: 'initial-layer',
          name: 'Layer 1',
          visible: true,
          opacity: 1,
          pixels: new Map()
        }],
        history: [],
        historyIndex: -1
      }],
  activeLayerId: initialState.activeLayerId || 'initial-layer',
  onionSkinningOpacity: 0.5
});

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_STATE': {
      return { 
        ...state, 
        ...(typeof action.payload === 'function' ? action.payload(state) : action.payload) 
      };
    }
    case 'UPDATE_PIXEL': {
      const { x, y, color } = action.payload;
      const key = `${x},${y}`;
      const frames = [...state.frames];
      const currentFrame = { ...frames[state.currentFrameIndex] };
      const layers = currentFrame.layers.map(layer => {
        if (layer.id === state.activeLayerId) {
          const newPixels = new Map(layer.pixels);
          color ? newPixels.set(key, color) : newPixels.delete(key);
          return { ...layer, pixels: newPixels };
        }
        return layer;
      });
      currentFrame.layers = layers;
      frames[state.currentFrameIndex] = currentFrame;
      return { ...state, frames };
    }
    case 'SAVE_STATE': {
      const currentFrame = state.frames[action.payload.frameIndex];
      
      console.log('Historial actual:', currentFrame.history?.length || 0);
      console.log('Guardando nuevo estado...');
      
      const newHistory = [
        ...(currentFrame.history || []).slice(-MAX_HISTORY_ENTRIES + 1),
        {
          frameIndex: action.payload.frameIndex,
          layerId: action.payload.layerId || state.activeLayerId,
          changes: action.payload.changes || [],
          type: action.payload.type || 'pixel'
        }
      ];
      
      console.log('Nuevo tamaño del historial:', newHistory.length);
      console.log('Límite máximo:', MAX_HISTORY_ENTRIES);
      
      const updatedFrames = state.frames.map((frame, index) =>
        index === action.payload.frameIndex
          ? { ...frame, history: newHistory, historyIndex: newHistory.length - 1 }
          : frame
      );

      return { ...state, frames: updatedFrames };
    }
    case 'UNDO': {
      // Implementar lógica de deshacer
      return state; // Placeholder
    }
    case 'REDO': {
      // Implementar lógica de rehacer
      return state; // Placeholder
    }
    case 'CLEAR_CANVAS': {
      return {
        ...state,
        frames: state.frames.map((frame, index) =>
          index === state.currentFrameIndex
            ? {
                ...frame,
                layers: frame.layers.map(layer => ({ ...layer, pixels: new Map() })),
                history: [],
                historyIndex: -1
              }
            : frame
        )
      };
    }
    case 'ADD_LAYER': {
      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: `Layer ${state.frames[state.currentFrameIndex].layers.length + 1}`,
        visible: true,
        opacity: 1,
        pixels: new Map()
      };
      const updatedFramesAdd = [...state.frames];
      updatedFramesAdd[state.currentFrameIndex].layers.push(newLayer);
      return { ...state, frames: updatedFramesAdd, activeLayerId: newLayer.id };
    }
    case 'REMOVE_LAYER': {
      const layerId = action.payload;
      if (state.frames[state.currentFrameIndex].layers.length <= 1) return state;
      const updatedLayers = state.frames[state.currentFrameIndex].layers.filter(l => l.id !== layerId);
      const updatedFramesRemove = [...state.frames];
      updatedFramesRemove[state.currentFrameIndex].layers = updatedLayers;
      return { 
        ...state, 
        frames: updatedFramesRemove, 
        activeLayerId: updatedLayers[updatedLayers.length - 1].id 
      };
    }
    case 'UPDATE_LAYER_VISIBILITY': {
      const { layerId: visId, visible } = action.payload;
      const updatedLayersVis = state.frames[state.currentFrameIndex].layers.map(layer =>
        layer.id === visId ? { ...layer, visible } : layer
      );
      const updatedFramesVis = [...state.frames];
      updatedFramesVis[state.currentFrameIndex].layers = updatedLayersVis;
      return { ...state, frames: updatedFramesVis };
    }
    case 'UPDATE_LAYER_OPACITY': {
      const { layerId: opId, opacity } = action.payload;
      const updatedLayersOp = state.frames[state.currentFrameIndex].layers.map(layer =>
        layer.id === opId ? { ...layer, opacity } : layer
      );
      const updatedFramesOp = [...state.frames];
      updatedFramesOp[state.currentFrameIndex].layers = updatedLayersOp;
      return { ...state, frames: updatedFramesOp };
    }
    case 'SET_ACTIVE_LAYER': {
      return { ...state, activeLayerId: action.payload };
    }
    default:
      return state;
  }
};

export const usePixelArtState = (initialState: State) => {
  const [state, dispatch] = useReducer(reducer, initialState, initialStateSetup);
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const currentStrokeRef = useRef<[string, string][]>([]);

  const updateState = useCallback((newState: Partial<State> | ((prevState: State) => Partial<State>)) => {
    dispatch({ type: 'UPDATE_STATE', payload: newState });
  }, []);

  const updatePixel = useCallback((x: number, y: number, color: string | null) => {
    dispatch({ type: 'UPDATE_PIXEL', payload: { x, y, color } });
  }, []);

  const saveState = useCallback(({ frameIndex, changes, layerId, type = 'pixel' }: { frameIndex: number; changes?: [string, string][]; layerId?: string; type?: 'pixel' | 'layer' }) => {
    // Implementar lógica de guardar estado
  }, []);

  const undo = useCallback(() => {
    // Implementar lógica de deshacer
  }, []);

  const redo = useCallback(() => {
    // Implementar lógica de rehacer
  }, []);

  const clearCanvas = useCallback(() => {
    dispatch({ type: 'CLEAR_CANVAS' });
    historyRef.current = [];
    futureRef.current = [];
    currentStrokeRef.current = [];
  }, []);

  const canUndo = useMemo(() => (state.frames[state.currentFrameIndex]?.historyIndex ?? 0) > 0, [state]);
  const canRedo = useMemo(() => (state.frames[state.currentFrameIndex]?.historyIndex ?? 0) < ((state.frames[state.currentFrameIndex]?.history?.length ?? 0) - 1), [state]);

  const addLayer = useCallback(() => {
    dispatch({ type: 'ADD_LAYER' });
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    dispatch({ type: 'REMOVE_LAYER', payload: layerId });
  }, []);

  const updateLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    dispatch({ type: 'UPDATE_LAYER_VISIBILITY', payload: { layerId, visible } });
  }, []);

  const updateLayerOpacity = useCallback((layerId: string, opacity: number) => {
    dispatch({ type: 'UPDATE_LAYER_OPACITY', payload: { layerId, opacity } });
  }, []);

  const setActiveLayerId = useCallback((layerId: string) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', payload: layerId });
  }, []);

  const toggleOnionSkinning = useCallback(() => {
    updateState(prevState => ({ onionSkinning: !prevState.onionSkinning }));
  }, [updateState]);

  const updateOnionSkinningOpacity = useCallback((opacity: number) => {
    updateState({ onionSkinningOpacity: opacity });
  }, [updateState]);

  return {
    state,
    updateState,
    updatePixel,
    saveState,
    undo,
    redo,
    clearCanvas,
    canUndo,
    canRedo,
    addLayer,
    removeLayer,
    updateLayerVisibility,
    updateLayerOpacity,
    setActiveLayerId,
    toggleOnionSkinning,
    updateOnionSkinningOpacity
  };
};

export default usePixelArtState;