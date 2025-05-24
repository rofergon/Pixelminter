import { State } from '@/types/types';

interface DecodedImageData {
  pixels: Map<string, string>;
  width: number;
  height: number;
}

export const decodeImage = async (
  file: File,
  maxSize: number = 256
): Promise<DecodedImageData> => {
  // ... código existente arriba ...
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      
      img.onload = () => {
        // Crear un canvas temporal para procesar la imagen
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Calcular las dimensiones manteniendo la proporción
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Configurar el canvas temporal
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Dibujar la imagen en el canvas temporal
        ctx.drawImage(img, 0, 0, width, height);
        
        // Obtener los datos de los píxeles
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = new Map<string, string>();

        // Procesar cada píxel
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            // Solo guardar píxeles no transparentes
            if (a > 0) {
              const color = `rgba(${r},${g},${b},${a/255})`;
              pixels.set(`${x},${y}`, color);
            }
          }
        }

        resolve({
          pixels,
          width,
          height
        });
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
};

// Añadir función auxiliar para convertir RGBA a HEX
const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return rgba;
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Función para convertir color HEX a RGB
const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Función para calcular la distancia entre dos colores RGB
const getColorDistance = (color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
};

// Función para encontrar el color más cercano en la paleta
const findClosestPaletteColor = (hexColor: string, palette: string[]): string => {
  const targetRgb = hexToRgb(hexColor);
  let closestColor = palette[0];
  let minDistance = Number.MAX_VALUE;

  palette.forEach(paletteColor => {
    const paletteRgb = hexToRgb(paletteColor);
    const distance = getColorDistance(targetRgb, paletteRgb);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = paletteColor;
    }
  });

  return closestColor;
};

export const applyDecodedImage = (
  decodedData: DecodedImageData,
  state: State,
  updatePixel: (x: number, y: number, color: string | null) => void
): void => {
  const { pixels, width, height } = decodedData;
  
  const offsetX = Math.floor((state.gridSize - width) / 2);
  const offsetY = Math.floor((state.gridSize - height) / 2);

  console.log('Estado antes de decodificar:', {
    frameIndex: state.currentFrameIndex,
    layerId: state.activeLayerId,
    frameActual: state.frames[state.currentFrameIndex],
    paletaDisponible: state.palette
  });

  // Limpiar el canvas actual
  for (let y = 0; y < state.gridSize; y++) {
    for (let x = 0; x < state.gridSize; x++) {
      updatePixel(x, y, null);
    }
  }

  const pixelChanges: { x: number, y: number, color: string }[] = [];

  pixels.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number);
    const newX = x + offsetX;
    const newY = y + offsetY;
    
    if (newX >= 0 && newX < state.gridSize && newY >= 0 && newY < state.gridSize) {
      // Convertir RGBA a HEX
      const hexColor = rgbaToHex(color);
      // Encontrar el color más cercano en la paleta
      const matchedColor = findClosestPaletteColor(hexColor, state.palette);
      
      console.log('Píxel de imagen decodificada:', {
        posiciónOriginal: key,
        posiciónNueva: `${newX},${newY}`,
        colorOriginal: color,
        colorHex: hexColor,
        colorFinal: matchedColor,
        tipo: 'Decodificado'
      });
      
      pixelChanges.push({ x: newX, y: newY, color: matchedColor });
    }
  });

  // Aplicar todos los cambios de una vez
  pixelChanges.forEach(({ x, y, color }) => {
    updatePixel(x, y, color);
  });

  console.log('Estado después de decodificar:', {
    frameIndex: state.currentFrameIndex,
    layerId: state.activeLayerId,
    frameActual: state.frames[state.currentFrameIndex],
    pixelsTotales: pixelChanges.length,
    pixelesAplicados: pixelChanges
  });
};

// Función auxiliar para validar el archivo
export const validateImageFile = (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxResolution = 256;

    if (!validTypes.includes(file.type)) {
      reject(new Error('Invalid file format. Please use PNG, JPEG or GIF.'));
    }

    if (file.size > maxSize) {
      reject(new Error('File is too large. Maximum size is 5MB.'));
    }

    // Validar resolución
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width > maxResolution || img.height > maxResolution) {
        reject(new Error(`Image resolution is too high. Maximum allowed is ${maxResolution}x${maxResolution} pixels.`));
      }
      resolve(true);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error loading image.'));
    };

    img.src = objectUrl;
  });
}; 