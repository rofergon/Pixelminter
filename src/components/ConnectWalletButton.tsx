/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useAccount, useContractReads } from 'wagmi';
import { BasePaintBrushAbi } from '@/abi/BasePaintBrushAbi';
import { BrushData } from '@/types/types';
import { useBrushData } from '@/hooks/tools/useBrushData';
import { useAppKit } from '@reown/appkit/react';

const ConnectWalletButton: React.FC<{ updateBrushData: (data: BrushData | null) => void }> = ({ updateBrushData }) => {
  const { userTokenIds, brushData, isLoading, balance } = useBrushData();
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  useEffect(() => {
    if (brushData) {
      updateBrushData(brushData);
    }
  }, [brushData, updateBrushData]);

  return (
    <div className="flex items-center justify-end flex-shrink-0 w-full">
      {/* Reown AppKit Web Component */}
      <div className="wallet-container">
        <appkit-button balance="hide" />
        
        {/* Brush Information Panel */}
        {isConnected && !isLoading && (balance || userTokenIds.length > 0 || brushData) && (
          <div className="mt-2 p-3 bg-gray-800/95 backdrop-blur-xl rounded-lg border border-gray-700/50 shadow-xl max-w-xs">
            <h4 className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
              Brush Information
            </h4>
            
            {balance && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-400">Balance:</span>
                <span className="text-sm font-medium text-white">{balance.toString()}</span>
              </div>
            )}
            
            {userTokenIds.length > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-400">Token IDs:</span>
                <span className="text-sm font-medium text-white max-w-[150px] truncate">
                  {userTokenIds.join(', ')}
                </span>
              </div>
            )}
            
            {brushData && (
              <>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-400">Active Token:</span>
                  <span className="text-sm font-medium text-blue-400">#{brushData.tokenId}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-400">Pixels/Day:</span>
                  <span className="text-sm font-medium text-green-400">{brushData.pixelsPerDay}</span>
                </div>
              </>
            )}
          </div>
        )}

        {isLoading && (
          <div className="mt-2 p-3 bg-gray-800/95 backdrop-blur-xl rounded-lg border border-gray-700/50 animate-pulse">
            <div className="h-4 bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-600 rounded w-3/4"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectWalletButton;