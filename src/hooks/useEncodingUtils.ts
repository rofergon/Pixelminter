import { State, Frame, Layer } from '../types/types';


export function encodePixelData(state: State): string {
  const { palette, frames, currentFrameIndex } = state;
  
  const currentFrame: Frame = frames[currentFrameIndex];

  let pixelData = "";
  let pixelCount = 0;

  // Iteramos sobre todas las capas del frame actual
  currentFrame.layers.forEach((layer: Layer) => {
    if (layer.visible) {
      layer.pixels.forEach((color, coord) => {
        const [x, y] = coord.split(',').map(Number);
        const colorIndex = palette.indexOf(color);
        if (colorIndex !== -1) {
          pixelData += x.toString(16).padStart(2, '0');
          pixelData += y.toString(16).padStart(2, '0');
          pixelData += colorIndex.toString(16).padStart(2, '0');
          pixelCount++;
        }
      });
    }
  });

  console.log('Encoded Pixel Data:', pixelData);
  console.log('Pixel Count:', pixelCount);

  return pixelData;
}

export function validateEncodingData(state: State): boolean {
  if (!state.theme) {
    console.error('Theme is missing from state');
    return false;
  }
  if (!Array.isArray(state.palette) || state.palette.length === 0) {
    console.error('Palette is missing or empty');
    return false;
  }
  if (!state.gridSize || state.gridSize <= 0) {
    console.error('Invalid grid size');
    return false;
  }
  if (!state.frames || state.frames.length === 0) {
    console.error('No frames available');
    return false;
  }
  if (state.currentFrameIndex < 0 || state.currentFrameIndex >= state.frames.length) {
    console.error('Invalid current frame index');
    return false;
  }
  return true;
}

// Función de ayuda para depuración
export function logFrameInfo(frame: Frame) {
  console.log('Frame Info:');
  // eslint-disable-next-line no-unused-vars
  let totalPixels = 0;
  frame.layers.forEach((layer: Layer, index: number) => {
    console.log(`Layer ${index + 1}:`);
    console.log(`Total pixels: ${layer.pixels.size}`);
    totalPixels += layer.pixels.size;
    layer.pixels.forEach((color, coord) => {
      console.log(`Pixel at ${coord}: ${color}`);
    });
  });
  
}