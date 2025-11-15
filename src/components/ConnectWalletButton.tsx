/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import { BrushData } from '@/types/types';
import { useBrushData } from '@/hooks/tools/useBrushData';

const ConnectWalletButton: React.FC<{ updateBrushData: (data: BrushData | null) => void }> = ({ updateBrushData }) => {
  const { brushData } = useBrushData();

  useEffect(() => {
    if (brushData) {
      updateBrushData(brushData);
    }
  }, [brushData, updateBrushData]);

  return (
    <div className="flex items-center justify-end flex-shrink-0 w-full">
      {/* Reown AppKit Web Component */}
      <appkit-button balance="hide" />
    </div>
  );
};

export default ConnectWalletButton;