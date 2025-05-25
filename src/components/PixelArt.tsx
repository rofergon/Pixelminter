import React, { useState, useRef, useEffect, useCallback } from 'react';
import PixelArtUI from './PixelArtUI';
import { useHandleInteraction } from '../hooks/canvas/useHandleInteraction';
import { useSetupCanvasEffect, useWindowResizeEffect } from '../hooks/useSetupCanvasEffect';
import { handleExtractPalette } from '../hooks/usePaletteUtils';
import useDrawGrid from '../hooks/canvas/useDrawGrid';
import useCanvasDisplay from '../hooks/canvas/useCanvasDisplay';
import { Feedback, SetFeedbackFunction, BrushData } from '../types/types';
import usePixelArtStateManager from '../hooks/usePixelArtStateManager';
import { saveStateToCache } from '../hooks/useCacheState';
import useShiftFrame from '../hooks/layers/useShiftFrame';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFlipCanvas } from '../hooks/useFlipCanvas';

const PixelArt: React.FC = () => {
  const {
    state, 
    updateState, 
    saveState,
    updatePixel, 
    undo, 
    redo, 
    clearCanvas: clearCanvasFromHook,
    canUndo,
    canRedo,
    addLayer,
    removeLayer,
    updateLayerVisibility,
    updateLayerOpacity,
    setActiveLayerId,
    updateLayerName,
    updateDay,
    toggleOnionSkinning,
    updateOnionSkinningOpacity,
    reorderLayers,
  } = usePixelArtStateManager();

  const [feedback, setFeedback] = useState<Feedback>({
    undo: false, redo: false, brush: false, eraser: false,
    toggleGrid: false, clearCanvas: false, zoomIn: false, zoomOut: false,
    move: false, bucket: false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const onionSkinningCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    stateRef.current = state;
    saveStateToCache(state);
  }, [state]);

  const setFeedbackWrapper: SetFeedbackFunction = useCallback((newFeedback) => {
    setFeedback(prev => {
      const updatedFeedback: Feedback = { ...prev };
      Object.entries(newFeedback).forEach(([key, value]) => {
        if (key in prev && typeof value === 'boolean') {
          updatedFeedback[key as keyof Feedback] = value;
        }
      });
      return updatedFeedback;
    });
  }, []);

  const updateCanvasDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Disable image smoothing to preserve exact pixel colors
        ctx.imageSmoothingEnabled = false;
        const { frames, currentFrameIndex, gridSize, canvasSize } = stateRef.current;
        const currentFrame = frames[currentFrameIndex] || { layers: [] };
        const cellSize = canvasSize / gridSize;
        
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        currentFrame.layers.forEach(layer => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            const pixelsMap = layer.pixels instanceof Map ? layer.pixels : new Map(Object.entries(layer.pixels));
            pixelsMap.forEach((color, key) => {
              const [x, y] = key.split(',').map(Number);
              ctx.fillStyle = typeof color === 'string' ? color : '#000000';
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            });
          }
        });
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  const { markPixelAsModified } = useCanvasDisplay({ canvasRef, stateRef });

  const drawGrid = useDrawGrid(gridCanvasRef, stateRef);

  const saveStateWrapper = useCallback((changes: [string, string][]) => {
    saveState(state.currentFrameIndex, changes);
  }, [saveState, state.currentFrameIndex]);

  const handleInteraction = useHandleInteraction({
    stateRef,
    canvasRef,
    containerRef,
    updatePixel,
    updateCanvasDisplay,
    saveState: saveStateWrapper,
    markPixelAsModified,
    updateState
  });

  const { handleShiftFrame } = useShiftFrame({
    state,
    updateState,
    saveState,
    updateCanvasDisplay
  });

  const handleHistoryAction = useCallback((action: 'undo' | 'redo') => {
    if ((action === 'undo' && canUndo) || (action === 'redo' && canRedo)) {
      action === 'undo' ? undo() : redo();
      setFeedbackWrapper({ [action]: true });
      setTimeout(() => setFeedbackWrapper({ [action]: false }), 100);
      updateCanvasDisplay();
    }
  }, [undo, redo, canUndo, canRedo, setFeedbackWrapper, updateCanvasDisplay]);
  
  const handleGridSizeChange = useCallback((newSize: number) => {
    updateState({ gridSize: newSize });
    drawGrid();
    updateCanvasDisplay();
  }, [updateState, drawGrid, updateCanvasDisplay]);

  const handleExtractPaletteCallback = useCallback(() => 
    handleExtractPalette(updateState, handleGridSizeChange), 
    [updateState, handleGridSizeChange]
  );

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      updateState({ scale: Math.min(clientWidth, clientHeight) / state.canvasSize });
    }
  }, [updateState, state.canvasSize]);

  const handleZoom = useCallback((zoomIn: boolean) => {
    updateState(prev => ({ zoom: Math.max(0.3, Math.min(3, prev.zoom + (zoomIn ? 0.15 : -0.125))) }));
    drawGrid();
    updateCanvasDisplay();
  }, [updateState, drawGrid, updateCanvasDisplay]);

  const handleClearCanvas = useCallback(() => {
    clearCanvasFromHook();
    updateCanvasDisplay();
    drawGrid();
  }, [clearCanvasFromHook, updateCanvasDisplay, drawGrid]);

  useSetupCanvasEffect(
    canvasRef,
    gridCanvasRef,
    stateRef,
    drawGrid,
    updateCanvasDisplay,
    () => saveState(state.currentFrameIndex, []),
    () => {}
  );

  useEffect(() => {
    updateCanvasDisplay();
  }, [state.frames, state.currentFrameIndex, updateCanvasDisplay]);

  useWindowResizeEffect(updateScale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend'];
      const options: AddEventListenerOptions = { passive: state.tool === 'move' };
      
      events.forEach(event => {
        canvas.addEventListener(event, handleInteraction as unknown as EventListener, options);
      });
      
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      
      return () => {
        events.forEach(event => {
          canvas.removeEventListener(event, handleInteraction as unknown as EventListener);
        });
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      };
    }
  }, [handleInteraction, state.tool]);

  const updateBrushData = useCallback((data: BrushData | null) => {
    updateState({ brushData: data });
  }, [updateState]);


  useEffect(() => {
    updateDay();
  }, [updateDay]);

  useKeyboardShortcuts({ handleHistoryAction });

  const { handleFlip } = useFlipCanvas(
    updatePixel,
    (changes) => saveState(state.currentFrameIndex, changes),
    state.gridSize
  );

  const handleKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      e.stopPropagation();
      handleFlip(state.frames[state.currentFrameIndex]);
      updateCanvasDisplay();
    }
  }, [handleFlip, state.frames, state.currentFrameIndex, updateCanvasDisplay]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut, true);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut, true);
  }, [handleKeyboardShortcut]);

  return (
    <div>
      <PixelArtUI
        state={state}
        containerRef={containerRef}
        canvasRef={canvasRef}
        gridCanvasRef={gridCanvasRef}
        updateState={updateState}
        feedback={feedback}
        handleHistoryAction={handleHistoryAction}
        updateCanvasDisplay={updateCanvasDisplay}
        saveState={() => saveState(state.currentFrameIndex)}
        drawGrid={drawGrid}
        handleExtractPalette={handleExtractPaletteCallback}
        handleZoom={handleZoom}
        clearCanvas={handleClearCanvas}
        onGridSizeChange={handleGridSizeChange}
        canUndo={canUndo}
        canRedo={canRedo}
        handleShiftFrame={handleShiftFrame}
        addLayer={addLayer}
        removeLayer={removeLayer}
        updateLayerVisibility={updateLayerVisibility}
        updateLayerOpacity={updateLayerOpacity}
        setActiveLayerId={setActiveLayerId}
        updateLayerName={updateLayerName}
        updateBrushData={updateBrushData}
        brushData={state.brushData}
        updateDay={updateDay}
        toggleOnionSkinning={toggleOnionSkinning}
        updateOnionSkinningOpacity={updateOnionSkinningOpacity}
        onionSkinningCanvas={onionSkinningCanvasRef}
        day={state.day ?? 1} // Usa 1 como valor por defecto si state.day es null
        reorderLayers={reorderLayers}
      />
    </div>
  );
};

export default React.memo(PixelArt);