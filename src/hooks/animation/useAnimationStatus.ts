import { useState, useEffect } from 'react';
import { getTotalPixelsPaintedToday } from '../useDateUtils';

const PIXELS_PER_FRAME = 200;
const FRAMES_PER_SECOND = 30;

export function useAnimationStatus(day: number) {
  const [pixels, setPixels] = useState<bigint | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const fetchPixels = async () => {
      try {
        const totalPixels = await getTotalPixelsPaintedToday();
        setPixels(totalPixels);
        
        const totalSeconds = Math.ceil(Number(totalPixels) / PIXELS_PER_FRAME / FRAMES_PER_SECOND);
        setSeconds(totalSeconds);
        
        const currentFrame = Math.floor(Number(totalPixels) / PIXELS_PER_FRAME) % FRAMES_PER_SECOND;
        setFrame(currentFrame);
      } catch (error) {
        console.error('Error al obtener los píxeles pintados:', error);
      }
    };

    fetchPixels();
    const intervalId = setInterval(fetchPixels, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(intervalId);
  }, [day]);

  return { pixels, seconds, frame };
}