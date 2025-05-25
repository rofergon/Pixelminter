import React from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletIsland,
  WalletAdvancedDefault,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
  Badge,
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';
import { Wallet as WalletIcon } from "lucide-react";

const DefaultAvatar = () => (
  <div className="h-6 w-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
    <WalletIcon className="h-3 w-3 text-white" />
  </div>
);

const LoadingAvatar = () => (
  <div className="h-6 w-6 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full animate-pulse shadow-sm"></div>
);

interface EnhancedWalletProps {
  variant?: 'default' | 'modal' | 'island' | 'advanced';
  className?: string;
}

const EnhancedWallet: React.FC<EnhancedWalletProps> = ({ 
  variant = 'default',
  className = ""
}) => {
  const { isConnected } = useAccount();

  // Variant: Modal - Uses the ConnectWallet with modal display from OnchainKitProvider
  if (variant === 'modal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <ConnectWallet
          className="h-10 px-6 text-sm font-semibold rounded-xl transition-all duration-300 
                     bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 
                     hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700
                     hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105
                     text-white border border-white/10
                     backdrop-blur-sm
                     flex items-center space-x-2"
          text={isConnected ? undefined : "Connect Wallet"}
        >
          <Avatar
            className="h-5 w-5"
            defaultComponent={<DefaultAvatar />}
            loadingComponent={<LoadingAvatar />}
          />
          {isConnected && <Name className="text-white font-medium" />}
        </ConnectWallet>
      </div>
    );
  }

  // Variant: Island - Uses WalletIsland for draggable experience
  if (variant === 'island') {
    return <WalletIsland />;
  }

  // Variant: Advanced - Uses WalletAdvancedDefault
  if (variant === 'advanced') {
    return <WalletAdvancedDefault />;
  }

  // Default variant - Enhanced traditional wallet
  return (
    <div className={`flex items-center ${className}`}>
      <Wallet>
        <ConnectWallet
          className="h-9 px-5 text-sm font-medium rounded-xl transition-all duration-300 
                     bg-gradient-to-r from-slate-800 to-slate-900 
                     hover:from-slate-700 hover:to-slate-800
                     border border-slate-600/50 hover:border-slate-500/70
                     text-white shadow-lg hover:shadow-xl
                     hover:scale-105 active:scale-95
                     flex items-center space-x-2"
          text={isConnected ? undefined : "Connect Wallet"}
        >
          <Avatar
            className="h-5 w-5"
            defaultComponent={<DefaultAvatar />}
            loadingComponent={<LoadingAvatar />}
          />
          {isConnected && <Name className="text-white font-medium" />}
        </ConnectWallet>
      </Wallet>
    </div>
  );
};

export default EnhancedWallet; 