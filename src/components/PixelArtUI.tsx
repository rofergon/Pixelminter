import React, { useState, useEffect } from 'react';
import SidePanel from './SidePanel';
import ToolPanel from './ToolPanel';
import { State, BrushData, Feedback } from '../types/types';
import CanvasComponent from './CanvasComponent';
import AnimationControls from './AnimationControls';
import ReferenceImage from './ReferenceImage';

// Interface defining all props passed to the PixelArtUI component
interface PixelArtUIProps {
  state: State; // Main application state containing canvas data, tools, layers, etc.
  containerRef: React.RefObject<HTMLDivElement>; // Reference to the main container element
  canvasRef: React.RefObject<HTMLCanvasElement>; // Reference to the main drawing canvas
  gridCanvasRef: React.RefObject<HTMLCanvasElement>; // Reference to the grid overlay canvas
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void; // Function to update application state
  feedback: Feedback; // Visual feedback state for user actions
  handleHistoryAction: (_action: 'undo' | 'redo') => void; // Function to handle undo/redo operations
  updateCanvasDisplay: () => void; // Function to refresh the canvas display
  saveState: () => void; // Function to save current state to history
  drawGrid: () => void; // Function to draw the pixel grid overlay
  handleExtractPalette: () => void; // Function to extract color palette from image
  handleZoom: (_zoomIn: boolean) => void; // Function to handle zoom in/out operations
  clearCanvas: () => void; // Function to clear the entire canvas
  onGridSizeChange: (_newSize: number) => void; // Function to handle grid size changes
  canUndo: boolean; // Whether undo operation is available
  canRedo: boolean; // Whether redo operation is available
  handleShiftFrame: (_direction: 'left' | 'right' | 'up' | 'down') => void; // Function to shift frame content
  addLayer: () => void; // Function to add a new layer
  removeLayer: (_id: string) => void; // Function to remove a layer by ID
  updateLayerVisibility: (_id: string, _visible: boolean) => void; // Function to toggle layer visibility
  updateLayerOpacity: (_id: string, _opacity: number) => void; // Function to update layer opacity
  setActiveLayerId: (_id: string) => void; // Function to set the active layer
  updateLayerName: (_id: string, _name: string) => void; // Function to update layer name
  reorderLayers: (_sourceIndex: number, _targetIndex: number) => void; // Function to reorder layers
  brushData: BrushData | null; // Current brush configuration data
  updateBrushData: (_data: BrushData | null) => void; // Function to update brush data
  updateDay: () => Promise<void>; // Function to update the current day counter
  toggleOnionSkinning: () => void; // Function to toggle onion skinning for animation
  updateOnionSkinningOpacity: (_opacity: number) => void; // Function to update onion skin opacity
  onionSkinningCanvas: React.RefObject<HTMLCanvasElement>; // Reference to onion skinning canvas
  day: number; // Current day counter for daily pixel art challenges
}

/**
 * Main UI component for the pixel art editor
 * Manages the layout and interaction between all major UI panels and components
 */
const PixelArtUI: React.FC<PixelArtUIProps> = ({
  state,
  containerRef,
  canvasRef,
  gridCanvasRef,
  updateState,
  feedback,
  handleHistoryAction,
  updateCanvasDisplay,
  saveState,
  drawGrid,
  handleExtractPalette,
  handleZoom,
  clearCanvas,
  onGridSizeChange,
  canUndo,
  canRedo,
  handleShiftFrame,
  addLayer,
  removeLayer,
  updateLayerVisibility,
  updateLayerOpacity,
  setActiveLayerId,
  updateLayerName,
  reorderLayers,
  brushData,
  updateBrushData,
  updateDay: _updateDay,
  toggleOnionSkinning,
  updateOnionSkinningOpacity,
  onionSkinningCanvas,
  day
}) => {
  // Local state for animation frame rate
  const [fps, setFps] = useState(30);
  // Local state to control side panel visibility
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  // Flag to track if component has mounted on client side (for SSR compatibility)
  const [isClient, setIsClient] = useState(false);

  // Set client flag after component mounts to handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Toggle function for side panel visibility
  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  // Dynamic canvas styling based on zoom level and canvas size
  // Only applies proper sizing after client-side hydration
  const canvasStyle = isClient
    ? {
        width: `${state.canvasSize * state.zoom}px`,
        height: `${state.canvasSize * state.zoom}px`,
        margin: 'auto',
      }
    : { width: '100%', height: '100%', margin: 'auto' };

  // Keyboard event handler for arrow key navigation
  // Allows shifting frame content using arrow keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleShiftFrame]);

  return (
    <div className="flex flex-col h-screen bg-slate-800 text-slate-200">
      {/* Main content area with three-panel layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel: Tool selection and controls */}
        <ToolPanel
          state={state}
          updateState={updateState}
          handleHistoryAction={handleHistoryAction}
          clearCanvas={clearCanvas}
          handleZoom={handleZoom}
          feedback={feedback}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Center panel: Main canvas area */}
        <div className={`flex-1 flex flex-col bg-slate-800/30 overflow-hidden transition-all duration-300 relative backdrop-blur-sm`}>
          <CanvasComponent
            state={state}
            containerRef={containerRef}
            canvasRef={canvasRef}
            gridCanvasRef={gridCanvasRef}
            updateState={updateState}
            saveState={saveState}
            canvasStyle={canvasStyle}
            drawGrid={drawGrid}
            updateCanvasDisplay={updateCanvasDisplay}
            onionSkinningCanvas={onionSkinningCanvas}
            toggleOnionSkinning={toggleOnionSkinning}
            updateOnionSkinningOpacity={updateOnionSkinningOpacity}
          />
        </div>

        {/* Right panel: Side panel with layers, colors, and settings */}
        <div
          className={`transition-all duration-300 relative ${
            isSidePanelOpen ? 'w-80' : 'w-12'
          } overflow-hidden bg-slate-800`}
        >
          {/* Toggle button for side panel - positioned on the left edge */}
          <button
            onClick={toggleSidePanel}
            className="p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200 focus:outline-none rounded-lg absolute top-1/2 transform -translate-y-1/2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border border-slate-600"
            style={{
              width: '28px',
              height: '28px',
              left: '-14px', // Positioned to overlap the panel edge
              zIndex: 50
            }}
          >
            <span className="text-xs font-medium">
              {isSidePanelOpen ? '›' : '‹'}
            </span>
          </button>

          {/* Side panel content */}
          <SidePanel
            state={state}
            updateState={updateState}
            handleExtractPalette={handleExtractPalette}          
            onGridSizeChange={onGridSizeChange}
            addLayer={addLayer}
            removeLayer={removeLayer}
            updateLayerVisibility={updateLayerVisibility}
            updateLayerOpacity={updateLayerOpacity}
            setActiveLayerId={setActiveLayerId}
            updateLayerName={updateLayerName}
            reorderLayers={reorderLayers}
            brushData={brushData}
            updateBrushData={updateBrushData}
            toggleOnionSkinning={toggleOnionSkinning}
            updateOnionSkinningOpacity={updateOnionSkinningOpacity}
            isOpen={isSidePanelOpen}
          />
        </div>
      </div>

      {/* Bottom panel: Animation controls */}
      <div className="w-full bg-slate-800 border-t border-slate-700 shadow-lg">
        <AnimationControls
          state={state}
          fps={fps}
          setFps={setFps}
          updateState={updateState}
          saveState={saveState}
          updateCanvasDisplay={updateCanvasDisplay}
          day={day}
        />
      </div>

      {/* Conditional reference image overlay */}
      {state.showReferenceImage && (
        <ReferenceImage
          url={state.referenceImageUrl}
          position={state.referenceImagePosition}
          size={state.referenceImageSize}
          onPositionChange={(position) => updateState({ referenceImagePosition: position })}
          onSizeChange={(size) => updateState({ referenceImageSize: size })}
          onUrlChange={(url) => updateState({ referenceImageUrl: url })}
        />
      )}

      {/* Global pointer event overlay for canvas interaction */}
      {/* This overlay captures pointer events outside the canvas and redirects them to the canvas */}
      <div 
        className="absolute inset-0 z-40 pointer-events-none"
        onPointerDown={(e) => {
          // Only handle events that target this overlay directly
          if (e.target === e.currentTarget) {
            e.preventDefault();
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              // Calculate relative position and create synthetic event for canvas
              const x = e.clientX - canvasRect.left;
              const y = e.clientY - canvasRect.top;
              const event = new PointerEvent('pointerdown', {
                clientX: x,
                clientY: y,
                bubbles: true,
              });
              canvasRef.current?.dispatchEvent(event);
            }
          }
        }}
        onPointerMove={(e) => {
          // Handle pointer move events during drawing
          if (state.isDrawing) {
            e.preventDefault();
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
              const x = e.clientX - canvasRect.left;
              const y = e.clientY - canvasRect.top;
              const event = new PointerEvent('pointermove', {
                clientX: x,
                clientY: y,
                bubbles: true,
              });
              canvasRef.current?.dispatchEvent(event);
            }
          }
        }}
        onPointerUp={(e) => {
          // Handle pointer up events to end drawing
          if (state.isDrawing) {
            e.preventDefault();
            const event = new PointerEvent('pointerup', {
              bubbles: true,
            });
            canvasRef.current?.dispatchEvent(event);
          }
        }}
      />
    </div>
  );
};

export default PixelArtUI;