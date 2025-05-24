import { useEffect, MutableRefObject } from 'react';
import { State } from '../types/types';

export const useSetupCanvasEffect = (
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  gridCanvasRef: MutableRefObject<HTMLCanvasElement | null>,
  stateRef: MutableRefObject<State>,
  drawGrid: () => void,
  updateCanvasDisplay: () => void,
  saveState: () => void,
  loadState: () => void
) => {
  useEffect(() => {
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      const gridCanvas = gridCanvasRef.current;

      if (canvas && gridCanvas) {
        // Configurar tamaño del canvas principal
        if (canvas.width !== stateRef.current.canvasSize || 
            canvas.height !== stateRef.current.canvasSize) {
          canvas.width = stateRef.current.canvasSize;
          canvas.height = stateRef.current.canvasSize;
        }

        // Configurar tamaño del canvas de la cuadrícula
        if (gridCanvas.width !== stateRef.current.canvasSize || 
            gridCanvas.height !== stateRef.current.canvasSize) {
          gridCanvas.width = stateRef.current.canvasSize;
          gridCanvas.height = stateRef.current.canvasSize;
        }

        // Dibujar la cuadrícula
        drawGrid();

        // Actualizar la visualización del canvas
        updateCanvasDisplay();

        // Manejar el estado inicial
        const currentFrame = stateRef.current.frames[stateRef.current.currentFrameIndex];
        if (currentFrame && currentFrame.history.length === 0) {
          saveState();
        } else {
          loadState();
        }
      } else {
        console.error("Uno o más de los canvas son nulos. Verifica las referencias.");
      }
    };

    setupCanvas();
  }, [
    canvasRef, 
    gridCanvasRef, 
    stateRef, 
    drawGrid, 
    updateCanvasDisplay, 
    saveState, 
    loadState
  ]);
};

export const useWindowResizeEffect = (updateScale: () => void) => {
  useEffect(() => {
    let resizeTimeout: number;

    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(updateScale, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
    };
  }, [updateScale]);
};