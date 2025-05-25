import { useCallback, useRef, MutableRefObject, useEffect } from 'react';
import { State, Layer } from '../../types/types';
import { bucketFill } from '../tools/useBucketFill';
import { draw, interpolate } from './drawUtils';

interface UseHandleInteractionProps {
  stateRef: MutableRefObject<State>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  updatePixel: (_x: number, _y: number, _color: string | null) => void;
  updateCanvasDisplay: () => void;
  saveState: (_changes: [string, string][]) => void;
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
  markPixelAsModified: (_layerId: string, _key: string) => void;  
}

export const useHandleInteraction = ({
  stateRef,
  canvasRef,
  containerRef,
  updatePixel,
  updateCanvasDisplay,
  saveState,
  updateState,
  markPixelAsModified
}: UseHandleInteractionProps) => {
  const isInteractingRef = useRef(false);
  const isPanningRef = useRef(false);
  const currentStrokeRef = useRef<[string, string][]>([]);
  const activeButtonRef = useRef<number | null>(null);
  const lastDrawnPixelRef = useRef<string | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingLineRef = useRef(false);
  const lineStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const getActiveLayer = useCallback((state: State): Layer | undefined =>
    state.frames[state.currentFrameIndex]?.layers.find(layer => layer.id === state.activeLayerId),
    []
  );

  const getGridCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { gridX: -1, gridY: -1 };

    const rect = canvas.getBoundingClientRect();
    const { scrollLeft, scrollTop } = container;
    const state = stateRef.current;
    const scale = state.canvasSize / (state.gridSize * state.zoom);
    const x = (clientX - rect.left + scrollLeft) / state.zoom;
    const y = (clientY - rect.top + scrollTop) / state.zoom;

    return {
      gridX: Math.floor(x / (state.canvasSize / state.gridSize)),
      gridY: Math.floor(y / (state.canvasSize / state.gridSize))
    };
  }, [canvasRef, containerRef, stateRef]);

  const handleDraw = useCallback((gridX: number, gridY: number, color: string | null, state: State) => {
    const activeLayer = getActiveLayer(state);
    if (activeLayer) {
      draw(
        gridX,
        gridY,
        color,
        state,
        updatePixel,
        key => markPixelAsModified(activeLayer.id, key),
        lastDrawnPixelRef,
        currentStrokeRef
      );
    }
  }, [updatePixel, markPixelAsModified, getActiveLayer]);

  const handleDrawLine = useCallback((startX: number, startY: number, endX: number, endY: number, color: string | null, state: State) => {
    const activeLayer = getActiveLayer(state);
    if (activeLayer) {
      const points = interpolate(startX, startY, endX, endY);
      points.forEach(([x, y]) => {
        draw(x, y, color, state, updatePixel, key => markPixelAsModified(activeLayer.id, key), lastDrawnPixelRef, currentStrokeRef);
      });
      updateCanvasDisplay();
      saveState(currentStrokeRef.current);
      currentStrokeRef.current = [];
    }
  }, [updateCanvasDisplay, saveState, updatePixel, markPixelAsModified, getActiveLayer]);

  const initPreviewCanvas = useCallback(() => {
    if (previewCtxRef.current) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = canvas.width;
      previewCanvas.height = canvas.height;
      previewCanvas.style.position = 'absolute';
      previewCanvas.style.top = '0';
      previewCanvas.style.left = '0';
      previewCanvas.style.pointerEvents = 'none';
      previewCanvas.style.zIndex = '10';
      canvas.parentNode?.insertBefore(previewCanvas, canvas.nextSibling);
      previewCanvasRef.current = previewCanvas;
      previewCtxRef.current = previewCanvas.getContext('2d');
    }
  }, [canvasRef]);

  const cleanupPreviewCanvas = useCallback(() => {
    if (previewCanvasRef.current) {
      previewCanvasRef.current.parentNode?.removeChild(previewCanvasRef.current);
      previewCanvasRef.current = null;
      previewCtxRef.current = null;
    }
  }, []);

  const drawPreviewLine = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    const previewCtx = previewCtxRef.current;
    if (!canvas || !previewCtx) return;

    const state = stateRef.current;
    const scale = state.zoom;
    const pixelSize = state.canvasSize / state.gridSize;

    previewCtx.clearRect(0, 0, canvas.width, canvas.height);
    previewCtx.save();
    previewCtx.scale(scale, scale);
    
    previewCtx.beginPath();
    previewCtx.moveTo(startX * pixelSize, startY * pixelSize);
    previewCtx.lineTo(endX * pixelSize, endY * pixelSize);
    previewCtx.strokeStyle = state.color || 'black';
    previewCtx.lineWidth = 1 / scale;
    previewCtx.stroke();
    
    previewCtx.restore();
  }, [canvasRef, previewCtxRef, stateRef]);

  const handleStart = useCallback((e: PointerEvent) => {
    const state = stateRef.current;
    if (state.tool === 'line') {
      initPreviewCanvas();
      isDrawingLineRef.current = true;
      lineStartRef.current = { clientX: e.clientX, clientY: e.clientY };
      lastDrawnPixelRef.current = null;
    } else if (state.tool.startsWith('move') || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
    } else if ([0, 2].includes(e.button)) {
      isInteractingRef.current = true;
      currentStrokeRef.current = [];
      activeButtonRef.current = e.button;
      lastDrawnPixelRef.current = null;

      const { gridX, gridY } = getGridCoordinates(e.clientX, e.clientY);
      const activeLayer = getActiveLayer(state);

      if (activeLayer) {
        if (state.tool === 'bucket' && e.button === 0) {
          const newPixels = bucketFill(activeLayer.pixels, gridX, gridY, state.color, state.gridSize);
          updateState(prevState => ({
            frames: prevState.frames.map((frame, index) => 
              index === prevState.currentFrameIndex
                ? {
                    ...frame,
                    layers: frame.layers.map(layer => 
                      layer.id === prevState.activeLayerId
                        ? { ...layer, pixels: new Map(newPixels) }
                        : layer
                    )
                  }
                : frame
            )
          }));
          updateCanvasDisplay();
          saveState(Array.from(newPixels.entries()));
        } else {
          const color = e.button === 0 ? (state.tool === 'eraser' ? null : state.color) : null;
          handleDraw(gridX, gridY, color, state);
          updateCanvasDisplay();
        }
      }
    }
  }, [stateRef, initPreviewCanvas, getGridCoordinates, getActiveLayer, updateState, updateCanvasDisplay, saveState, handleDraw]);

  const handleMove = useCallback((e: PointerEvent) => {
    const state = stateRef.current;

    if (isDrawingLineRef.current && state.tool === 'line' && lineStartRef.current) {
      const startPos = getGridCoordinates(lineStartRef.current.clientX, lineStartRef.current.clientY);
      const currentPos = getGridCoordinates(e.clientX, e.clientY);
      drawPreviewLine(
        startPos.gridX,
        startPos.gridY,
        currentPos.gridX,
        currentPos.gridY
      );
    } else if (isPanningRef.current && panStartRef.current) {
      const container = containerRef.current;
      if (container) {
        container.scrollLeft += panStartRef.current.x - e.clientX;
        container.scrollTop += panStartRef.current.y - e.clientY;
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    } else if (isInteractingRef.current && state.tool !== 'move') {
      const { gridX, gridY } = getGridCoordinates(e.clientX, e.clientY);
      const color = activeButtonRef.current === 0
        ? (state.tool === 'eraser' ? null : state.color)
        : null;

      if (lastDrawnPixelRef.current) {
        const [lastX, lastY] = lastDrawnPixelRef.current.split(',').map(Number);
        const points = interpolate(lastX, lastY, gridX, gridY);
        
        points.forEach(([x, y]) => {
          handleDraw(x, y, color, state);
        });
      } else {
        handleDraw(gridX, gridY, color, state);
      }
      
      updateCanvasDisplay();
    }
  }, [stateRef, getGridCoordinates, drawPreviewLine, containerRef, handleDraw, updateCanvasDisplay]);

  const handleEnd = useCallback((e: PointerEvent) => {
    if (isDrawingLineRef.current && lineStartRef.current) {
      const state = stateRef.current;
      const startPos = getGridCoordinates(lineStartRef.current.clientX, lineStartRef.current.clientY);
      const endPos = getGridCoordinates(e.clientX, e.clientY);
      handleDrawLine(
        startPos.gridX,
        startPos.gridY,
        endPos.gridX,
        endPos.gridY,
        state.color,
        state
      );
    }
    cleanupPreviewCanvas();
    isDrawingLineRef.current = false;
    lineStartRef.current = null;

    if (isInteractingRef.current) {
      isInteractingRef.current = false;
      activeButtonRef.current = null;
      lastDrawnPixelRef.current = null;
      if (currentStrokeRef.current.length > 0) {
        saveState(currentStrokeRef.current);
        updateCanvasDisplay();
      }
      currentStrokeRef.current = [];
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
    }
  }, [stateRef, getGridCoordinates, handleDrawLine, cleanupPreviewCanvas, saveState, updateCanvasDisplay]);

  const handleInteraction = useCallback((e: PointerEvent) => {
    const state = stateRef.current;
    if (state.tool !== 'move') e.preventDefault();

    switch (e.type) {
      case 'pointerdown':
        handleStart(e);
        break;
      case 'pointermove':
        handleMove(e);
        break;
      case 'pointerup':
      case 'pointercancel':
        handleEnd(e);
        break;
      default:
        break;
    }
  }, [stateRef, handleStart, handleMove, handleEnd]);

  useEffect(() => {
    return () => {
      cleanupPreviewCanvas();
    };
  }, [cleanupPreviewCanvas]);

  return handleInteraction;
};

export default useHandleInteraction;
