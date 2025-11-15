import React from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

interface EnhancedWalletProps {
  variant?: 'default' | 'modal' | 'island' | 'advanced';
  className?: string;
}

const EnhancedWallet: React.FC<EnhancedWalletProps> = ({ 
  variant = 'default',
  className = ""
}) => {
  const { isConnected } = useAccount();

  // All variants use the same Reown AppKit button
  // The modal behavior is controlled globally in OnchainProviders
  return (
    <div className={`flex items-center ${className}`}>
      <appkit-button />
    </div>
  );
};

export default EnhancedWallet; 