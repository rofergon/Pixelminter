/// <reference types="node" />
import { State, Frame, Layer } from '../types/types';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

// Exportamos la constante para que pueda ser usada en otros archivos
export const MAX_HISTORY_ENTRIES = 50;
export const MAX_STORAGE_SIZE_MB = 7;
export const STATE_CACHE_KEY = 'pixelArtAppState';
export const STATE_VERSION = '1.0';

let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

export const saveStateToCache = (state: State) => {
  if (throttleTimeout) {
    clearTimeout(throttleTimeout);
  }

  throttleTimeout = setTimeout(() => {
    try {
      const stateToProcess = {
        ...state,
        isPaletteLoading: false
      };

      const limitedState = {
        ...stateToProcess,
        frames: stateToProcess.frames.map(frame => ({
          ...frame,
          history: frame.history?.slice(-MAX_HISTORY_ENTRIES) || [],
          layers: frame.layers.map(layer => ({
            ...layer,
            pixels: Array.from(layer.pixels.entries())
          }))
        }))
      };

      const stateToSave = {
        version: STATE_VERSION,
        timestamp: Date.now(),
        data: limitedState
      };
      
      const serializedState = JSON.stringify(stateToSave);
      const compressedState = compressToUTF16(serializedState);

      const sizeInMB = (compressedState.length * 2) / (1024 * 1024);
      if (sizeInMB > MAX_STORAGE_SIZE_MB) {
        console.warn('El tamaño del estado excede el máximo permitido.');
        return;
      }

      localStorage.setItem(STATE_CACHE_KEY, compressedState);
    } catch (error) {
      console.error('Error al guardar el estado en la caché:', error);
      clearCache();
    }
  }, 700);
};

export const handleImmediateAction = (state: State, action: () => void) => {
  action();
  saveStateToCache(state);
};

export const loadStateFromCache = (): State | undefined => {
  try {
    const compressedState = localStorage.getItem(STATE_CACHE_KEY);
    if (!compressedState) return undefined;

    const serializedState = decompressFromUTF16(compressedState);
    if (!serializedState) {
      clearCache();
      return undefined;
    }

    const parsedData = JSON.parse(serializedState);
    
    if (!parsedData || !parsedData.version || !parsedData.data || !parsedData.data.frames) {
      clearCache();
      return undefined;
    }

    const { version, data: parsedState } = parsedData;

    if (version !== STATE_VERSION) {
      clearCache();
      return undefined;
    }

    return {
      ...parsedState,
      isPaletteLoading: false,
      // Asegurar que las nuevas propiedades existan con valores por defecto
      backgroundRefreshInterval: parsedState.backgroundRefreshInterval ?? 20,
      lastBackgroundRefresh: parsedState.lastBackgroundRefresh ?? 0,
      frames: parsedState.frames.map((frame: Frame) => ({
        ...frame,
        layers: frame.layers.map((layer: Layer) => ({
          ...layer,
          pixels: new Map(Array.isArray(layer.pixels) ? layer.pixels : [])
        }))
      }))
    } as State;
  } catch (error) {
    console.error('Error al cargar el estado desde la caché:', error);
    clearCache();
    return undefined;
  }
};

export const clearCache = () => {
  localStorage.removeItem(STATE_CACHE_KEY);
};