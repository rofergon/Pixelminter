/* eslint-disable no-unused-vars */
import { useCallback, useState } from 'react';
import GIF from 'gif.js';
import { Frame, State } from '../../types/types';

interface GifExporterOptions {
  width: number;
  height: number;
  quality?: number;
  repeat?: number;
  defaultDelay?: number;
}

interface UseGifExporterReturn {
  createGif: (frames: Frame[], options: GifExporterOptions, state: State) => Promise<Blob>;
  isExporting: boolean;
  exportProgress: number;
}

const useGifExporter = (): UseGifExporterReturn => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const createGif = useCallback(async (frames: Frame[], options: GifExporterOptions, state: State): Promise<Blob> => {
    setIsExporting(true);
    setExportProgress(0);

    const { width, height, quality = 10, repeat = 0, defaultDelay = 500 } = options;

    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: width,
        height: height,
        repeat: repeat
      });

      frames.forEach((frame, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to get canvas context'));
          return;
        }

        addFrameToCanvas(ctx, frame, width, height, state.zoom, state.canvasSize);
        gif.addFrame(canvas, { delay: defaultDelay });

        setExportProgress((index + 1) / frames.length);
      });

      gif.on('finished', (blob) => {
        setIsExporting(false);
        setExportProgress(1);
        resolve(blob);
      });

      gif.render();
    });
  }, []);

  return { createGif, isExporting, exportProgress };
};

const addFrameToCanvas = (ctx: CanvasRenderingContext2D, frame: Frame, width: number, height: number, zoom: number, canvasSize: number): void => {
  const cellSize = canvasSize / frame.layers[0].pixels.size;
  const scale = Math.min(width / canvasSize, height / canvasSize);

  frame.layers.forEach(layer => {
    if (layer.visible) {
      ctx.globalAlpha = layer.opacity;
      layer.pixels.forEach((color, key) => {
        const [x, y] = key.split(',').map(Number);
        const scaledX = x * scale;
        const scaledY = y * scale;
        ctx.fillStyle = color;
        ctx.fillRect(scaledX, scaledY, scale, scale);
      });
    }
  });

  ctx.globalAlpha = 1;
};

export default useGifExporter;