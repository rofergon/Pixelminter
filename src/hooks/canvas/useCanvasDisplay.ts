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
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastBackgroundUrlRef = useRef<string>('');
  const isBackgroundLoadingRef = useRef<boolean>(false);

  // Function to load background image
  const loadBackgroundImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load background image'));
      // Use the proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      img.src = proxyUrl;
    });
  }, []);

  // Function to render background to a separate canvas (only when needed)
  const renderBackground = useCallback(async () => {
    const { canvasSize, dailyImageUrl, showBackgroundImage, backgroundOpacity } = stateRef.current;

    // Initialize background canvas if needed
    if (!backgroundCanvasRef.current) {
      backgroundCanvasRef.current = document.createElement('canvas');
      backgroundCanvasRef.current.width = canvasSize;
      backgroundCanvasRef.current.height = canvasSize;
      backgroundCtxRef.current = backgroundCanvasRef.current.getContext('2d');
      if (backgroundCtxRef.current) {
        backgroundCtxRef.current.imageSmoothingEnabled = false;
      }
    }

    const backgroundCanvas = backgroundCanvasRef.current;
    const backgroundCtx = backgroundCtxRef.current;
    if (!backgroundCtx) return;

    // Update canvas size if needed
    if (backgroundCanvas.width !== canvasSize || backgroundCanvas.height !== canvasSize) {
      backgroundCanvas.width = canvasSize;
      backgroundCanvas.height = canvasSize;
    }

    // Clear background canvas
    backgroundCtx.clearRect(0, 0, canvasSize, canvasSize);

    // Only load and render background if enabled and URL exists
    if (showBackgroundImage && dailyImageUrl) {
      try {
        // Prevent multiple simultaneous loads
        if (isBackgroundLoadingRef.current) return;
        
        // Only reload image if URL changed
        if (!backgroundImageRef.current || lastBackgroundUrlRef.current !== dailyImageUrl) {
          isBackgroundLoadingRef.current = true;
          backgroundImageRef.current = await loadBackgroundImage(dailyImageUrl);
          lastBackgroundUrlRef.current = dailyImageUrl;
          isBackgroundLoadingRef.current = false;
        }

        if (backgroundImageRef.current) {
          backgroundCtx.globalAlpha = backgroundOpacity;
          backgroundCtx.drawImage(
            backgroundImageRef.current,
            0, 0, backgroundImageRef.current.width, backgroundImageRef.current.height,
            0, 0, canvasSize, canvasSize
          );
          backgroundCtx.globalAlpha = 1;
        }
      } catch (error) {
        console.error('Error loading background image:', error);
        isBackgroundLoadingRef.current = false;
      }
    }
  }, [stateRef, loadBackgroundImage]);

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

    // Render background asynchronously without blocking
    renderBackground();

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

    // Draw background from background canvas if available
    if (backgroundCanvasRef.current) {
      offCtx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

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
  }, [canvasRef, stateRef, renderBackground]);

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
