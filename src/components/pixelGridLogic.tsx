/* eslint-disable no-unused-vars */
import { PixelGrid as PixelGridType } from '../types/types';

export class PixelGrid implements PixelGridType {
  pixels: Map<string, string>;

  constructor(public width: number, public height: number) {
    this.pixels = new Map();
  }

  setPixel(x: number, y: number, color: string | null) {
    const key = `${x},${y}`;
    color ? this.pixels.set(key, color) : this.pixels.delete(key);
  }

  getPixel(x: number, y: number): string | null {
    return this.pixels.get(`${x},${y}`) || null;
  }

  clear() {
    this.pixels.clear();
  }

  clone(): PixelGrid {
    const newGrid = new PixelGrid(this.width, this.height);
    this.pixels.forEach((color, key) => newGrid.pixels.set(key, color));
    return newGrid;
  }

  toArray(): [string, string][] {
    return Array.from(this.pixels.entries());
  }

  static fromData(
    data: [string, string][] | Map<string, string> | Record<string, string>,
    width: number,
    height: number
  ): PixelGrid {
    const grid = new PixelGrid(width, height);
    const entries = Array.isArray(data)
      ? data
      : data instanceof Map
      ? Array.from(data.entries())
      : Object.entries(data);

    entries.forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number) as [number, number];
      grid.setPixel(x, y, color);
    });

    return grid;
  }
}

export const fillPixel = (
  grid: PixelGrid,
  x: number,
  y: number,
  color: string | null,
  cellSize: number
): void => {
  const gridX = Math.floor(x / cellSize);
  const gridY = Math.floor(y / cellSize);
  if (gridX >= 0 && gridX < grid.width && gridY >= 0 && gridY < grid.height) {
    grid.setPixel(gridX, gridY, color);
  }
};

export const renderGrid = (
  grid: PixelGrid,
  ctx: CanvasRenderingContext2D,
  cellSize: number
): void => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  grid.pixels.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number) as [number, number];
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  });
};

export const clearCanvas = (grid: PixelGrid): void => {
  grid.clear();
};

export const gridToArray = (grid: PixelGrid): [string, string][] => grid.toArray();

export const arrayToGrid = (
  data: [string, string][] | Map<string, string> | Record<string, string>,
  width: number,
  height: number
): PixelGrid => PixelGrid.fromData(data, width, height);

export const canvasToGridCoordinates = (
  canvasX: number,
  canvasY: number,
  cellSize: number
): [number, number] => [Math.floor(canvasX / cellSize), Math.floor(canvasY / cellSize)];