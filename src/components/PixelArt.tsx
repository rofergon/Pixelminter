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

/**
 * Main PixelArt component that serves as the container for the entire pixel art editor
 * This component manages all the core functionality including:
 * - State management through custom hooks
 * - Canvas rendering and interaction
 * - Layer management
 * - Animation controls
 * - Keyboard shortcuts
 * - History (undo/redo) operations
 */
const PixelArt: React.FC = () => {
  // Main state manager hook that handles all pixel art data and operations
  const {
    state, // Current application state
    updateState, // Function to update state
    saveState, // Function to save state to history
    updatePixel, // Function to update individual pixels
    undo, // Undo operation
    redo, // Redo operation
    clearCanvas: clearCanvasFromHook, // Clear canvas operation
    canUndo, // Whether undo is available
    canRedo, // Whether redo is available
    addLayer, // Add new layer
    removeLayer, // Remove layer by ID
    updateLayerVisibility, // Toggle layer visibility
    updateLayerOpacity, // Update layer opacity
    setActiveLayerId, // Set active layer
    updateLayerName, // Update layer name
    updateDay, // Update day counter
    toggleOnionSkinning, // Toggle onion skinning for animation
    updateOnionSkinningOpacity, // Update onion skin opacity
    reorderLayers, // Reorder layers
  } = usePixelArtStateManager();

  // Local state for visual feedback when user performs actions
  const [feedback, setFeedback] = useState<Feedback>({
    undo: false, redo: false, brush: false, eraser: false,
    toggleGrid: false, clearCanvas: false, zoomIn: false, zoomOut: false,
    move: false, bucket: false
  });

  // React refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null); // Main drawing canvas
  const gridCanvasRef = useRef<HTMLCanvasElement>(null); // Grid overlay canvas
  const containerRef = useRef<HTMLDivElement>(null); // Container for canvas
  const stateRef = useRef(state); // Ref to current state for event handlers
  const onionSkinningCanvasRef = useRef<HTMLCanvasElement>(null); // Onion skinning canvas

  // Keep state ref updated and save to cache whenever state changes
  useEffect(() => {
    stateRef.current = state;
    saveStateToCache(state);
  }, [state]);

  // Wrapper function for setting feedback with type safety
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

  // Function to update the canvas display with current pixel data
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
        
        // Clear canvas and redraw all visible layers
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        currentFrame.layers.forEach(layer => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            // Handle both Map and Object pixel storage formats
            const pixelsMap = layer.pixels instanceof Map ? layer.pixels : new Map(Object.entries(layer.pixels));
            pixelsMap.forEach((color, key) => {
              const [x, y] = key.split(',').map(Number);
              ctx.fillStyle = typeof color === 'string' ? color : '#000000';
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            });
          }
        });
        ctx.globalAlpha = 1; // Reset alpha
      }
    }
  }, []);

  // Hook for canvas display utilities
  const { markPixelAsModified } = useCanvasDisplay({ canvasRef, stateRef });

  // Hook for drawing the grid overlay
  const drawGrid = useDrawGrid(gridCanvasRef, stateRef);

  // Wrapper for save state that includes frame index
  const saveStateWrapper = useCallback((changes: [string, string][]) => {
    saveState(state.currentFrameIndex, changes);
  }, [saveState, state.currentFrameIndex]);

  // Hook for handling all canvas interactions (drawing, erasing, etc.)
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

  // Hook for shifting frame content in different directions
  const { handleShiftFrame } = useShiftFrame({
    state,
    updateState,
    saveState,
    updateCanvasDisplay
  });

  // Handler for undo/redo operations with feedback
  const handleHistoryAction = useCallback((action: 'undo' | 'redo') => {
    if ((action === 'undo' && canUndo) || (action === 'redo' && canRedo)) {
      action === 'undo' ? undo() : redo();
      setFeedbackWrapper({ [action]: true });
      // Clear feedback after short delay
      setTimeout(() => setFeedbackWrapper({ [action]: false }), 100);
      updateCanvasDisplay();
    }
  }, [undo, redo, canUndo, canRedo, setFeedbackWrapper, updateCanvasDisplay]);
  
  // Handler for grid size changes
  const handleGridSizeChange = useCallback((newSize: number) => {
    updateState({ gridSize: newSize });
    drawGrid();
    updateCanvasDisplay();
  }, [updateState, drawGrid, updateCanvasDisplay]);

  // Callback for palette extraction functionality
  const handleExtractPaletteCallback = useCallback(() => 
    handleExtractPalette(updateState, handleGridSizeChange), 
    [updateState, handleGridSizeChange]
  );

  // Function to update canvas scale based on container size
  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      updateState({ scale: Math.min(clientWidth, clientHeight) / state.canvasSize });
    }
  }, [updateState, state.canvasSize]);

  // Handler for zoom operations with bounds checking
  const handleZoom = useCallback((zoomIn: boolean) => {
    updateState(prev => ({ zoom: Math.max(0.3, Math.min(3, prev.zoom + (zoomIn ? 0.15 : -0.125))) }));
    drawGrid();
    updateCanvasDisplay();
  }, [updateState, drawGrid, updateCanvasDisplay]);

  // Handler for clearing the entire canvas
  const handleClearCanvas = useCallback(() => {
    clearCanvasFromHook();
    updateCanvasDisplay();
    drawGrid();
  }, [clearCanvasFromHook, updateCanvasDisplay, drawGrid]);

  // Setup canvas effects (initialization, event listeners, etc.)
  useSetupCanvasEffect(
    canvasRef,
    gridCanvasRef,
    stateRef,
    drawGrid,
    updateCanvasDisplay,
    () => saveState(state.currentFrameIndex, []),
    () => {}
  );

  // Update canvas display when frames or current frame changes
  useEffect(() => {
    updateCanvasDisplay();
  }, [state.frames, state.currentFrameIndex, updateCanvasDisplay]);

  // Handle window resize events
  useWindowResizeEffect(updateScale);

  // Setup canvas event listeners for pointer/touch interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend'];
      // Use passive events for move tool to improve performance
      const options = { passive: state.tool === 'move' };
      
      // Add all interaction event listeners
      events.forEach(event => {
        canvas.addEventListener(event, handleInteraction as any, options);
      });
      
      // Prevent context menu on canvas
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      
      // Cleanup event listeners
      return () => {
        events.forEach(event => {
          canvas.removeEventListener(event, handleInteraction as any);
        });
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      };
    }
  }, [handleInteraction, state.tool]);

  // Function to update brush data
  const updateBrushData = useCallback((data: BrushData | null) => {
    updateState({ brushData: data });
  }, [updateState]);

  // Update day counter on component mount
  useEffect(() => {
    updateDay();
  }, [updateDay]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({ handleHistoryAction });

  // Hook for canvas flipping functionality
  const { handleFlip } = useFlipCanvas(
    updatePixel,
    (changes) => saveState(state.currentFrameIndex, changes),
    state.gridSize
  );

  // Keyboard shortcut handler for flip operation (Ctrl/Cmd + F)
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

  // Setup keyboard shortcut event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut, true);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut, true);
  }, [handleKeyboardShortcut]);

  return (
    <div>
      {/* Main UI component with all props passed down */}
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
        day={state.day ?? 1} // Use 1 as default value if state.day is null
        reorderLayers={reorderLayers}
      />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export default React.memo(PixelArt);