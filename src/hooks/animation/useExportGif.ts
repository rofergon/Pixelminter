import { useState, useCallback } from 'react';
import GIF from 'gif.js';
import { State, Layer } from '../../types/types';

export function useExportGif(state: State, fps: number) {
  const [isExporting, setIsExporting] = useState(false);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error('Error loading image:', e);
        reject(new Error(`Failed to load image from ${proxyUrl}`));
      };
      img.src = proxyUrl;
    });
  };

  const calculatePaintedArea = (frames: State['frames']): { minX: number, minY: number, maxX: number, maxY: number } => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    frames.forEach(frame => {
      frame.layers.forEach((layer: Layer) => {
        if (layer.visible) {
          layer.pixels.forEach((color: string, key: string) => {
            const [x, y] = key.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        }
      });
    });
    return { minX, minY, maxX, maxY };
  };

  const exportGif = useCallback((): Promise<Blob> => {
    if (state.frames.length === 0) {
      return Promise.reject(new Error("No frames to export. Please add frames first."));
    }

    setIsExporting(true);
    
    return new Promise<Blob>((resolve, reject) => {
      const processFrames = async () => {
        try {
          console.log('Starting GIF export');

          const { minX, minY, maxX, maxY } = calculatePaintedArea(state.frames);
          const paintedWidth = maxX - minX + 1;
          const paintedHeight = maxY - minY + 1;
          const margin = 220; 

          const zoomFactor = Math.min(
            (state.canvasSize - 1 * margin) / paintedWidth,
            (state.canvasSize - 1 * margin) / paintedHeight
          );

          const gif = new GIF({
            workers: 2,
            quality: 6,
            width: state.canvasSize,
            height: state.canvasSize,
            workerScript: '/gif.worker.js'
          });

          let backgroundImage: HTMLImageElement | null = null;
          if (state.showBackgroundImage && state.dailyImageUrl) {
            try {
              backgroundImage = await loadImage(state.dailyImageUrl);
            } catch (error) {
              console.error('Failed to load background image:', error);
            }
          }

          for (const frame of state.frames) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = state.canvasSize;
            tempCanvas.height = state.canvasSize;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (tempCtx) {
              tempCtx.save();
              tempCtx.translate(margin, margin);
              tempCtx.scale(zoomFactor, zoomFactor);
              tempCtx.translate(-minX, -minY);

              tempCtx.imageSmoothingEnabled = false;

              if (backgroundImage) {
                tempCtx.drawImage(backgroundImage, 0, 0, state.gridSize, state.gridSize);
              }

              frame.layers.forEach((layer: Layer) => {
                if (layer.visible) {
                  tempCtx.globalAlpha = layer.opacity;
                  layer.pixels.forEach((color, key) => {
                    const [x, y] = key.split(',').map(Number);
                    tempCtx.fillStyle = color;
                    tempCtx.fillRect(x - 0.05, y - 0.05, 1.05, 1.05);
                  });
                }
              });

              tempCtx.restore();
              gif.addFrame(tempCanvas, { delay: 1000 / fps });
            }
          }

          gif.on('finished', (blob) => {
            setIsExporting(false);
            console.log('GIF export completed successfully');
            resolve(blob);
          });

          gif.render();
        } catch (error) {
          console.error("Error creating GIF:", error);
          reject(error);
          setIsExporting(false);
        }
      };

      processFrames();
    });
  }, [state, fps]);

  return { exportGif, isExporting };
}