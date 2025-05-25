import { Frame } from '../types/types';

export const useFlipCanvas = (
  updatePixel: (_x: number, _y: number, _color: string, _layerId: string) => void,
  saveState: (_changes: [string, string][]) => void,
  gridSize: number
) => {
  const handleFlip = (currentFrame: Frame) => {
    const changes: [string, string][] = [];

    // Recorremos cada capa
    currentFrame.layers.forEach(layer => {
      if (!layer.visible) return;

      const pixelsMap = layer.pixels instanceof Map ? 
        layer.pixels : 
        new Map(Object.entries(layer.pixels));

      // Guardamos los píxeles originales
      const originalPixels = new Map(pixelsMap);
      
      // Limpiamos la capa actual
      pixelsMap.clear();

      // Creamos el nuevo mapa de píxeles volteado
      originalPixels.forEach((color, key) => {
        if (typeof color === 'string') {  // Verificamos que color sea string
          const [x, y] = key.split(',').map(Number);
          const newX = gridSize - 1 - x; // Invertimos la posición X
          
          updatePixel(newX, y, color, layer.id);
          changes.push([`${newX},${y}`, color]);
        }
      });
    });

    // Guardamos los cambios en el historial
    saveState(changes);
  };

  return { handleFlip };
};
