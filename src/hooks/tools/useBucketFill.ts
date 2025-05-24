export const bucketFill = (
  pixels: Map<string, string>, 
  startX: number, 
  startY: number, 
  newColor: string, 
  gridSize: number
): Map<string, string> => {
  const key = `${startX},${startY}`;
  const startColor = pixels.get(key);
  if (startColor === newColor) return pixels;

  const newPixels = new Map(pixels);
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const currentKey = `${x},${y}`;
    const currentColor = newPixels.get(currentKey);

    if (currentColor === startColor) {
      newPixels.set(currentKey, newColor);

      // Comprueba los píxeles adyacentes
      if (x > 0) stack.push([x - 1, y]);
      if (x < gridSize - 1) stack.push([x + 1, y]);
      if (y > 0) stack.push([x, y - 1]);
      if (y < gridSize - 1) stack.push([x, y + 1]);
    }
  }

  return newPixels;
};