import { useCallback, MutableRefObject } from 'react';
import { State } from '../../types/types';

function useDrawGrid(
  gridCanvasRef: MutableRefObject<HTMLCanvasElement | null>,
  stateRef: MutableRefObject<State>
) {
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing to preserve exact pixel colors
    ctx.imageSmoothingEnabled = false;

    const { canvasSize, zoom, gridSize } = stateRef.current;
    const scaledSize = canvasSize * zoom;

    // Ajustar el tamaño del canvas para que coincida exactamente con el canvas principal
    canvas.width = scaledSize;
    canvas.height = scaledSize;
    canvas.style.width = `${scaledSize}px`;
    canvas.style.height = `${scaledSize}px`;

    // Limpia el canvas antes de dibujar
    ctx.clearRect(0, 0, scaledSize, scaledSize);

    // Configuración del estilo de la cuadrícula
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 0.5;

    // Calcular el tamaño de celda exacto que coincida con el renderizado de píxeles
    const cellSize = scaledSize / gridSize;

    // Dibujar la cuadrícula con líneas perfectamente alineadas
    ctx.beginPath();
    for (let i = 0; i <= gridSize; i++) {
      // Usar Math.floor para asegurar líneas nítidas en píxeles enteros
      const pos = Math.floor(i * cellSize) + 0.5; // +0.5 para líneas nítidas

      // Líneas verticales
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, scaledSize);

      // Líneas horizontales
      ctx.moveTo(0, pos);
      ctx.lineTo(scaledSize, pos);
    }
    ctx.stroke();
  }, [gridCanvasRef, stateRef]);

  return drawGrid;
}

export default useDrawGrid;