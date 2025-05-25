import { useCallback, useRef, MutableRefObject, useEffect, RefObject } from 'react';
import { State, Layer } from '../../types/types';

interface CanvasRefs {
  canvasRef: RefObject<HTMLCanvasElement>;
  stateRef: MutableRefObject<State>;
}

interface CanvasDisplayFunctions {
  updateCanvasDisplay: () => void;
  markPixelAsModified: () => void;
}

const useCanvasDisplay = ({ canvasRef, stateRef }: CanvasRefs): CanvasDisplayFunctions => {
  const requestIdRef = useRef<number | null>(null);
  const offScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const updateCanvasDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing to preserve exact pixel colors
    ctx.imageSmoothingEnabled = false;

    const { frames, currentFrameIndex, canvasSize, gridSize } = stateRef.current;
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return;

    const cellSize = canvasSize / gridSize;

    // Initialize off-screen canvas if it doesn't exist
    if (!offScreenCanvasRef.current) {
      offScreenCanvasRef.current = document.createElement('canvas');
      offScreenCanvasRef.current.width = canvasSize;
      offScreenCanvasRef.current.height = canvasSize;
      offCtxRef.current = offScreenCanvasRef.current.getContext('2d');
      if (offCtxRef.current) {
        offCtxRef.current.imageSmoothingEnabled = false;
      }
    }

    const offScreenCanvas = offScreenCanvasRef.current!;
    const offCtx = offCtxRef.current;
    if (!offCtx) return;

    // Update canvas size if it has changed
    if (offScreenCanvas.width !== canvasSize || offScreenCanvas.height !== canvasSize) {
      offScreenCanvas.width = canvasSize;
      offScreenCanvas.height = canvasSize;
    }

    // Clear the off-screen canvas
    offCtx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw the layers
    currentFrame.layers.forEach((layer: Layer) => {
      if (layer.visible) {
        offCtx.globalAlpha = layer.opacity;

        layer.pixels.forEach((color, key) => {
          const [pixelX, pixelY] = key.split(',').map(Number);
          offCtx.fillStyle = color;
          offCtx.fillRect(pixelX * cellSize, pixelY * cellSize, cellSize, cellSize);
        });
      }
    });

    // Reset globalAlpha
    offCtx.globalAlpha = 1;

    // Draw the off-screen canvas onto the main canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.drawImage(offScreenCanvas, 0, 0);

    // Force repaint on iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      canvas.style.display = 'none';
      canvas.offsetHeight; // Trigger reflow
      canvas.style.display = 'block';
    }
  }, [canvasRef, stateRef]);

  const markPixelAsModified = useCallback(() => {
    if (requestIdRef.current === null) {
      requestIdRef.current = requestAnimationFrame(() => {
        updateCanvasDisplay();
        requestIdRef.current = null;
      });
    }
  }, [updateCanvasDisplay]);

  useEffect(() => {
    return () => {
      if (requestIdRef.current !== null) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, []);

  return { updateCanvasDisplay, markPixelAsModified };
};

export default useCanvasDisplay;
