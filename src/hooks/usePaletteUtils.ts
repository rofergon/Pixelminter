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
    
    // Validate image URL before setting it
    let validImageUrl = '';
    if (data.imageUrl && data.imageUrl.trim() !== '') {
      try {
        // Try to construct URL to validate format
        new URL(data.imageUrl);
        validImageUrl = data.imageUrl;
      } catch (urlError) {
        console.error('Invalid image URL received from API:', data.imageUrl);
      }
    } else {
      console.warn('No image URL received from theme API');
    }
    
    updateState({ 
      palette: data.palette, 
      theme: data.theme, 
      isPaletteLoading: false,
      dailyImageUrl: validImageUrl,
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
      dailyImageUrl: '', // Clear image URL on error
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
};

// Resto de las funciones...