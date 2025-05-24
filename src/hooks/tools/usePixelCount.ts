import { useState, useEffect } from 'react';
import { State, Layer, Frame } from '../../types/types';

export const usePixelCountAndDroplets = (state: State, initialDroplets: number) => {
  const [pixelCount, setPixelCount] = useState(0);
  const [droplets, setDroplets] = useState(initialDroplets);

  useEffect(() => {
    let totalPixelCount = 0;
    
    state.frames.forEach((frame: Frame) => {
      frame.layers.forEach((layer: Layer) => {
        if (layer.visible) {
          totalPixelCount += layer.pixels.size;
        }
      });
    });

    setPixelCount(totalPixelCount);
    setDroplets(Math.max(0, initialDroplets - totalPixelCount));
  }, [state.frames, initialDroplets]);

  return { pixelCount, droplets };
};