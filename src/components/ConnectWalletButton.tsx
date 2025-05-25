/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
  Badge,
} from '@coinbase/onchainkit/identity';
import { useAccount, useContractReads, usePublicClient } from 'wagmi';
import { BasePaintBrushAbi } from '@/abi/BasePaintBrushAbi';
import { getContract, ContractFunctionExecutionError } from 'viem';
import { BrushData } from '@/types/types';
import { useBrushData } from '@/hooks/tools/useBrushData';
import { CircleUserIcon, Wallet as WalletIcon } from "lucide-react";

const DefaultAvatar = () => (
  <div className="h-4 w-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
    <WalletIcon className="h-2 w-2 text-white" />
  </div>
);

const LoadingAvatar = () => (
  <div className="h-4 w-4 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full animate-pulse shadow-sm"></div>
);

// Componente personalizado para el nombre truncado con tooltip
const TruncatedName: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title="Hover to see full name"
    >
      <Name className="text-white font-medium truncate max-w-[120px] block text-sm" />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 border border-gray-600">
          <Name className="text-white" />
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

const ConnectWalletButton: React.FC<{ updateBrushData: (data: BrushData | null) => void }> = ({ updateBrushData }) => {
  const { userTokenIds, brushData, isLoading, balance } = useBrushData();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (brushData) {
      updateBrushData(brushData);
    }
  }, [brushData, updateBrushData]);

  return (
    <div className="flex items-center justify-end flex-shrink-0 w-full">
      {/* Wallet Component */}
      <Wallet>
        <ConnectWallet
          className={`h-8 px-4 text-sm font-medium rounded-lg transition-all duration-200 
                     bg-gradient-to-r from-blue-600 to-purple-600 
                     hover:from-blue-700 hover:to-purple-700 
                     active:from-blue-800 active:to-purple-800
                     text-white border border-blue-500/20
                     shadow-lg hover:shadow-xl hover:scale-[1.02]
                     flex items-center space-x-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     backdrop-blur-sm flex-shrink-0
                     ${isConnected ? 'min-w-[140px] max-w-[180px]' : 'min-w-[100px]'}`}
          text={isConnected ? undefined : "Connect Wallet"}
        >
          <Avatar
            className="h-5 w-5 flex-shrink-0"
            defaultComponent={<DefaultAvatar />}
            loadingComponent={<LoadingAvatar />}
          />
          {isConnected && <TruncatedName />}
        </ConnectWallet>

        <WalletDropdown className="min-w-[300px] rounded-2xl shadow-2xl bg-gray-800/95 backdrop-blur-xl border border-gray-700/50">
          <Identity
            className="px-6 pt-6 pb-4"
            hasCopyAddressOnClick
            schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
          >
            <div className="flex flex-col items-center space-y-3">
              <Avatar
                className="h-16 w-16 border-2 border-blue-500/30 shadow-lg"
                defaultComponent={
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <WalletIcon className="h-8 w-8 text-white" />
                  </div>
                }
                loadingComponent={<LoadingAvatar />}
              >
                <Badge className="ring-2 ring-gray-800" />
              </Avatar>
              
              <div className="text-center space-y-1">
                <Name className="text-lg font-semibold text-white" />
                <Address className="text-sm text-gray-400 font-mono" />
                <EthBalance className="text-sm font-medium text-green-400" />
              </div>
            </div>

            {/* Brush Data Section */}
            {!isLoading && (balance || userTokenIds.length > 0 || brushData) && (
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600/30">
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
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600/30 animate-pulse">
                <div className="h-4 bg-gray-600 rounded mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-3/4"></div>
              </div>
            )}
          </Identity>

          {/* Basename Section */}
          <div className="px-6 py-2">
            <WalletDropdownBasename className="hover:bg-gray-700/50 transition-colors duration-200 rounded-lg" />
          </div>

          {/* Disconnect Button */}
          <div className="px-6 pb-6">
            <WalletDropdownDisconnect className="w-full py-3 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 font-medium text-sm border border-red-500/20" />
          </div>
        </WalletDropdown>
      </Wallet>
    </div>
  );
};

export default ConnectWalletButton;