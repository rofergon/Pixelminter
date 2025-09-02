/* eslint-disable no-unused-vars */

import { MutableRefObject } from 'react';
import { RefObject } from 'react';

export interface PixelGrid {
  width: number;
  height: number;
  pixels: Map<string, string>;
  setPixel: (x: number, y: number, color: string | null) => void;
  getPixel: (x: number, y: number) => string | null;
  clear: () => void;
}

export interface Layer {
  id: string;
  name: string;
  pixels: Map<string, string>;
  visible: boolean;
  opacity: number;
}

export interface HistoryEntry {
  frameIndex: number;
  layerId: string;
  changes: [string, string][]; // [pixelKey, color]
  type: 'pixel' | 'layer' | 'clear';
}

export interface Frame {
  layers: Layer[];
  history: HistoryEntry[];
  historyIndex: number;
}

export interface State {
  showBackgroundImage: boolean;
  frames: Frame[];
  currentFrameIndex: number;
  gridSize: number;
  canvasSize: number;
  color: string;
  tool: 'brush' | 'eraser' | 'bucket' | 'move' | 'line';
  showGrid: boolean;
  zoom: number;
  scale: number;
  isDrawing: boolean;
  palette: string[];
  theme: string;
  dailyImageUrl: string;
  isPaletteLoading: boolean;
  activeTab: string;
  error?: string;
  customPalette: string[];
  touchEnabled: boolean;
  activeLayerId: string;
  brushData: BrushData | null;
  pixelsPerDay?: number; // Agregamos esta línea
  day: number | null;
  onionSkinning: boolean;
  onionSkinningOpacity: number;
  backgroundOpacity: number;
  showReferenceImage: boolean; // Añade esta línea
  referenceImageUrl: string; // Añade esta línea
  referenceImagePosition: { x: number; y: number }; // Añade esta línea
  referenceImageSize: { width: number; height: number }; // Añade esta línea
  fps: number; // Añadimos esta línea
  brushSize: number; // Añade esta línea
  backgroundRefreshInterval: number; // Intervalo en segundos para actualizar imagen de fondo
  lastBackgroundRefresh: number; // Timestamp de la última actualización de imagen de fondo
}

export const initialState: State = {
  showBackgroundImage: true,
  frames: [{
    layers: [{
      id: 'initial-layer',
      name: 'Layer 1',
      pixels: new Map(),
      visible: true,
      opacity: 1
    }],
    history: [],
    historyIndex: -1
  }],
  currentFrameIndex: 0,
  gridSize: 16,
  canvasSize: 256,
  color: '',
  tool: 'brush', // Valor inicial puede ser 'brush' por defecto
  showGrid: true,
  zoom: 2,
  scale: 2,
  isDrawing: false,
  palette: [],
  theme: '',
  dailyImageUrl: '',
  isPaletteLoading: false,
  activeTab: '',
  customPalette: [],
  touchEnabled: false,
  activeLayerId: 'initial-layer',
  brushData: null,
  pixelsPerDay: 0, // Inicializamos con un valor por defecto
  day: null,
  onionSkinning: false,
  onionSkinningOpacity: 0.5, // Añade esta línea
  backgroundOpacity: 1,
  showReferenceImage: false, // Añadimos esta línea
  referenceImageUrl: '', // Añadimos esta línea
  referenceImagePosition: { x: 0, y: 0 }, // Añadimos esta línea
  referenceImageSize: { width: 0, height: 0 }, // Añadimos esta línea
  fps: 30, // Valor inicial para FPS
  brushSize: 1, // Añade esta línea
  backgroundRefreshInterval: 20, // Actualizar imagen de fondo cada 20 segundos
  lastBackgroundRefresh: 0, // Timestamp inicial
};

export interface Feedback {
  undo: boolean;
  redo: boolean;
  brush: boolean;
  eraser: boolean;
  bucket: boolean;
  move: boolean;
  toggleGrid: boolean;
  clearCanvas: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  [key: string]: boolean;
}

export type SetFeedbackFunction = (newFeedback: Partial<{ [K in keyof Feedback]: boolean }>) => void;

export type FrameType = Frame;
export type StateType = State;

export interface CanvasRefs {
  internalCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  displayCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  stateRef: MutableRefObject<State>;
}

export interface BrushData {
  tokenId: string;
  pixelsPerDay: number;
}

export interface PixelArtUIProps {
  onionSkinningCanvas: RefObject<HTMLCanvasElement>;
  drawGrid: () => void;
}