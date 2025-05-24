/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { State } from '../types/types';
import { validateEncodingData, logFrameInfo, encodePixelData } from './useEncodingUtils';

export const useSidePanelLogic = (
  state: State,
  updateState: (newState: Partial<State> | ((prevState: State) => Partial<State>)) => void,
  handleExtractPalette: () => void,
  onGridSizeChange: (newSize: number) => void
) => {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleBackgroundImage = (checked: boolean) => {
    updateState((prevState) => ({ ...prevState, showBackgroundImage: checked }));
  };

  const handleAddCustomColor = () => {
    updateState((prevState) => ({
      ...prevState,
      customPalette: [...prevState.customPalette, prevState.color]
    }));
  };

  const handleClearCustomPalette = () => {
    updateState((prevState) => ({
      ...prevState,
      customPalette: []
    }));
  };

  const handleEncodeData = () => {
    if (!validateEncodingData(state)) {
      console.error('Invalid data for encoding. Please ensure all required data is present.');
      return;
    }

    logFrameInfo(state.frames[state.currentFrameIndex]);

    const encodedData = encodePixelData(state);
    console.log('Final Encoded Data:', encodedData);
  };

  return {
    isWalletOpen,
    setIsWalletOpen,
    isClient,
    toggleBackgroundImage,
    handleAddCustomColor,
    handleClearCustomPalette,
    handleEncodeData
  };
};