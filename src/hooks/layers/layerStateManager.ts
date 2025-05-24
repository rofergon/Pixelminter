import { v4 as uuidv4 } from 'uuid';
import { State, Layer } from '../../types/types';

export const addLayer = (state: State): Partial<State> => {
  const currentFrame = state.frames[state.currentFrameIndex] || { layers: [], history: [], historyIndex: -1 };
  const layers = currentFrame.layers || [];
  const newLayer: Layer = {
    id: uuidv4(),
    name: `Layer ${layers.length + 1}`,
    pixels: new Map(),
    visible: true,
    opacity: 1
  };
  
  const updatedFrames = state.frames.map((frame, index) => 
    index === state.currentFrameIndex
      ? { ...frame, layers: [...layers, newLayer] }
      : frame
  );

  if (updatedFrames.length === 0) {
    updatedFrames.push({
      layers: [newLayer],
      history: [],
      historyIndex: -1
    });
  }

  return {
    frames: updatedFrames,
    activeLayerId: newLayer.id
  };
};

export const removeLayer = (state: State, layerId: string): Partial<State> => {
  const currentFrame = state.frames[state.currentFrameIndex];
  if (currentFrame.layers.length <= 1) {
    return {}; // No eliminar la última capa
  }
  const updatedLayers = currentFrame.layers.filter(layer => layer.id !== layerId);
  const updatedFrames = state.frames.map((frame, index) => 
    index === state.currentFrameIndex
      ? { ...frame, layers: updatedLayers }
      : frame
  );
  const newActiveLayerId = layerId === state.activeLayerId
    ? updatedLayers[updatedLayers.length - 1].id
    : state.activeLayerId;
  return {
    frames: updatedFrames,
    activeLayerId: newActiveLayerId
  };
};

const updateLayerProperty = (
  state: State, 
  layerId: string, 
  property: keyof Layer, 
  value: any
): Partial<State> => {
  const updatedFrames = state.frames.map((frame, index) => 
    index === state.currentFrameIndex
      ? {
          ...frame,
          layers: frame.layers.map(layer => 
            layer.id === layerId ? { ...layer, [property]: value } : layer
          )
        }
      : frame
  );
  return { frames: updatedFrames };
};

export const updateLayerVisibility = (state: State, layerId: string, visible: boolean): Partial<State> => {
  return updateLayerProperty(state, layerId, 'visible', visible);
};

export const updateLayerOpacity = (state: State, layerId: string, opacity: number): Partial<State> => {
  return updateLayerProperty(state, layerId, 'opacity', opacity);
};

export const updateLayerName = (state: State, layerId: string, name: string): Partial<State> => {
  return updateLayerProperty(state, layerId, 'name', name);
};

export const getCurrentLayers = (state: State): Layer[] => {
  const currentFrame = state.frames[state.currentFrameIndex] || { layers: [] };
  return currentFrame.layers || [];
};

export const reorderLayers = (state: State, sourceIndex: number, targetIndex: number): Partial<State> => {
  const currentFrame = state.frames[state.currentFrameIndex];
  const newLayers = [...currentFrame.layers];
  const [movedLayer] = newLayers.splice(sourceIndex, 1);
  newLayers.splice(targetIndex, 0, movedLayer);

  const updatedFrames = state.frames.map((frame, index) => 
    index === state.currentFrameIndex
      ? { ...frame, layers: newLayers }
      : frame
  );

  return { frames: updatedFrames };
};