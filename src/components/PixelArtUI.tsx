import React, { useState, useEffect } from 'react';
import SidePanel from './SidePanel';
import ToolPanel from './ToolPanel';
import { State, BrushData, Feedback } from '../types/types';
import CanvasComponent from './CanvasComponent';
import AnimationControls from './AnimationControls';
import ReferenceImage from './ReferenceImage';

interface PixelArtUIProps {
  state: State;
  containerRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gridCanvasRef: React.RefObject<HTMLCanvasElement>;
  updateState: (_newState: Partial<State> | ((_prevState: State) => Partial<State>)) => void;
  feedback: Feedback;
  handleHistoryAction: (_action: 'undo' | 'redo') => void;
  updateCanvasDisplay: () => void;
  saveState: () => void;
  drawGrid: () => void;
  handleExtractPalette: () => void;
  handleZoom: (_zoomIn: boolean) => void;
  clearCanvas: () => void;
  onGridSizeChange: (_newSize: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  handleShiftFrame: (_direction: 'left' | 'right' | 'up' | 'down') => void;
  addLayer: () => void;
  removeLayer: (_id: string) => void;
  updateLayerVisibility: (_id: string, _visible: boolean) => void;
  updateLayerOpacity: (_id: string, _opacity: number) => void;
  setActiveLayerId: (_id: string) => void;
  updateLayerName: (_id: string, _name: string) => void;
  reorderLayers: (_sourceIndex: number, _targetIndex: number) => void;
  brushData: BrushData | null;
  updateBrushData: (_data: BrushData | null) => void;
  updateDay: () => Promise<void>;
  toggleOnionSkinning: () => void;
  updateOnionSkinningOpacity: (_opacity: number) => void;
  onionSkinningCanvas: React.RefObject<HTMLCanvasElement>;
  day: number;
}

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
  const [fps, setFps] = useState(30);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleSidePanel = () => {
    setIsSidePanelOpen(!isSidePanelOpen);
  };

  const canvasStyle = isClient
    ? {
        width: `${state.canvasSize * state.zoom}px`,
        height: `${state.canvasSize * state.zoom}px`,
        margin: 'auto',
      }
    : { width: '100%', height: '100%', margin: 'auto' };

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
      <div className="flex flex-1 overflow-hidden relative">
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

        <div
          className={`transition-all duration-300 relative ${
            isSidePanelOpen ? 'w-80' : 'w-12'
          } overflow-hidden bg-slate-800`}
        >
          <button
            onClick={toggleSidePanel}
            className="p-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200 focus:outline-none rounded-lg absolute top-1/2 transform -translate-y-1/2 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border border-slate-600"
            style={{
              width: '28px',
              height: '28px',
              left: '-14px',
              zIndex: 50
            }}
          >
            <span className="text-xs font-medium">
              {isSidePanelOpen ? '›' : '‹'}
            </span>
          </button>

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

      <div 
        className="absolute inset-0 z-40 pointer-events-none"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (canvasRect) {
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