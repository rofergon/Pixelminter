/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useCallback } from 'react';
import { State, Layer } from '../types/types';
import { useWindowResizeEffect } from '../hooks/useSetupCanvasEffect';

interface CanvasComponentProps {
  state: State;
  containerRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gridCanvasRef: React.RefObject<HTMLCanvasElement>;
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  saveState: () => void;
  canvasStyle?: React.CSSProperties;
  drawGrid: () => void;
  updateCanvasDisplay: () => void;
  onionSkinningCanvas: React.RefObject<HTMLCanvasElement>;
  toggleOnionSkinning: () => void;
  updateOnionSkinningOpacity: (opacity: number) => void;
}

const CanvasComponent: React.FC<CanvasComponentProps> = ({
  state,
  containerRef,
  canvasRef,
  gridCanvasRef,
  updateState,
  saveState,
  canvasStyle,
  onionSkinningCanvas,
  drawGrid,
  toggleOnionSkinning,
  updateOnionSkinningOpacity
}) => {
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderLayers = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!canvas || !offscreenCanvas) return;

    const ctx = canvas.getContext('2d');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!ctx || !offscreenCtx) return;

    const currentFrame = state.frames[state.currentFrameIndex] || { layers: [] };
    const layers = currentFrame.layers || [];
    const cellSize = state.canvasSize / state.gridSize;

    // Clear the offscreen canvas
    offscreenCtx.clearRect(0, 0, state.canvasSize, state.canvasSize);

    // Render each layer to the offscreen canvas
    layers.forEach((layer: Layer) => {
      if (layer.visible) {
        offscreenCtx.globalAlpha = layer.opacity;
        const pixelsMap = layer.pixels instanceof Map ? layer.pixels : new Map(Object.entries(layer.pixels));
        pixelsMap.forEach((color, key) => {
          const [x, y] = key.split(',').map(Number);
          offscreenCtx.fillStyle = typeof color === 'string' ? color : '#000000';
          offscreenCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        });
      }
    });

    // Clear the main canvas
    ctx.clearRect(0, 0, state.canvasSize, state.canvasSize);

    // Draw the offscreen canvas onto the main canvas
    ctx.drawImage(offscreenCanvas, 0, 0);

    // Reset global alpha
    ctx.globalAlpha = 1;
  }, [state, canvasRef, offscreenCanvasRef]);

  const renderOnionSkin = useCallback(() => {
    if (!onionSkinningCanvas) return;

    const canvas = onionSkinningCanvas.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaledSize = state.canvasSize * state.zoom;
    canvas.width = scaledSize;
    canvas.height = scaledSize;
    canvas.style.width = `${scaledSize}px`;
    canvas.style.height = `${scaledSize}px`;

    ctx.clearRect(0, 0, scaledSize, scaledSize);

    if (!state.onionSkinning) return;

    const currentIndex = state.currentFrameIndex;
    const frames = state.frames;
    const cellSize = scaledSize / state.gridSize;

    ctx.scale(state.zoom, state.zoom);

    // Renderizar los dos frames anteriores
    for (let i = 1; i <= 2; i++) {
      const frameIndex = (currentIndex - i + frames.length) % frames.length;
      const frame = frames[frameIndex];
      const opacity = state.onionSkinningOpacity / i; // Usar la opacidad configurada

      ctx.globalAlpha = opacity;
      frame.layers.forEach((layer: Layer) => {
        if (layer.visible) {
          layer.pixels.forEach((color, key) => {
            const [x, y] = key.split(',').map(Number);
            ctx.fillStyle = color;
            ctx.fillRect(x * (cellSize / state.zoom), y * (cellSize / state.zoom), cellSize / state.zoom, cellSize / state.zoom);
          });
        }
      });
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transformation
    ctx.globalAlpha = 1;
  }, [state, onionSkinningCanvas]);

  useEffect(() => {
    renderLayers();
    renderOnionSkin();
  }, [renderLayers, renderOnionSkin]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = state.canvasSize;
      canvasRef.current.height = state.canvasSize;
      canvasRef.current.style.width = `${state.canvasSize * state.zoom}px`;
      canvasRef.current.style.height = `${state.canvasSize * state.zoom}px`;
    }

    if (gridCanvasRef.current) {
      gridCanvasRef.current.width = state.canvasSize;
      gridCanvasRef.current.height = state.canvasSize;
      gridCanvasRef.current.style.width = `${state.canvasSize * state.zoom}px`;
      gridCanvasRef.current.style.height = `${state.canvasSize * state.zoom}px`;
    }

    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = state.canvasSize;
    offscreenCanvasRef.current.height = state.canvasSize;
  }, [canvasRef, gridCanvasRef, state.canvasSize, state.zoom]);

  useWindowResizeEffect(() => {
    const { clientWidth, clientHeight } = containerRef.current || { clientWidth: 0, clientHeight: 0 };
    updateState({ scale: Math.min(clientWidth, clientHeight) / state.canvasSize });
  });

  useEffect(() => {
    const handleResize = () => {
      const { clientWidth, clientHeight } = containerRef.current || { clientWidth: 0, clientHeight: 0 };
      updateState({ scale: Math.min(clientWidth, clientHeight) / state.canvasSize });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [containerRef, updateState, state.canvasSize]);

  useEffect(() => {
    drawGrid(); // Llama a drawGrid cuando sea necesario
  }, [drawGrid, state.gridSize, state.canvasSize]); // Asegúrate de incluir las dependencias correctas

  useEffect(() => {
    if (state.onionSkinning) {
      renderOnionSkin();
    } else if (onionSkinningCanvas && onionSkinningCanvas.current) {
      const ctx = onionSkinningCanvas.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, state.canvasSize * state.zoom, state.canvasSize * state.zoom);
      }
    }
  }, [state.onionSkinning, state.currentFrameIndex, state.frames, renderOnionSkin, state.canvasSize, onionSkinningCanvas, state.zoom]);

  return (
    <div className="overflow-auto max-w-full max-h-full">
      <div
        ref={containerRef}
        className={`relative ${state.touchEnabled ? '' : 'touch-none'}`}
        style={canvasStyle}
        onContextMenu={(e) => e.preventDefault()}
      >
        {state.dailyImageUrl && state.showBackgroundImage && (
          <div
            className="absolute inset-0 z-0 w-full h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${state.dailyImageUrl})`,
              opacity: state.backgroundOpacity
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 w-full h-full"
          width={state.canvasSize}
          height={state.canvasSize}
        />
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ opacity: state.showGrid ? 1 : 0 }}
          width={state.canvasSize}
          height={state.canvasSize}
        />
        {onionSkinningCanvas && (
          <canvas
            ref={onionSkinningCanvas}
            className="absolute inset-0 z-5 pointer-events-none"
            style={{
              opacity: state.onionSkinning ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              width: `${state.canvasSize * state.zoom}px`,
              height: `${state.canvasSize * state.zoom}px`
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CanvasComponent;