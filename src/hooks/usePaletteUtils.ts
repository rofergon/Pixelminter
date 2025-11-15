/* eslint-disable no-unused-vars */
import { calculateDay } from './useDateUtils';
import { State } from '../types/types';

interface PaletteData {
  palette: string[];
  theme: string;
  imageUrl: string;
}

export const handleExtractPalette = async (
  updateState: (newState: Partial<State>) => void,
  onGridSizeChange: (newSize: number) => void
): Promise<void> => {
  updateState({ isPaletteLoading: true });
  try {
    const day = await calculateDay();
    const apiUrl = `/api/theme/${day}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data: PaletteData = await response.json();
    
    updateState({ 
      palette: data.palette, 
      theme: data.theme, 
      isPaletteLoading: false,
      dailyImageUrl: data.imageUrl,
    });

    if (typeof onGridSizeChange === 'function') {
      onGridSizeChange(256);
    } else {
      console.warn('onGridSizeChange is not a function');
    }

  } catch (error) {
    console.error('Error fetching color palette and image:', error);
    updateState({ 
      isPaletteLoading: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
};

// Resto de las funciones...