import React from 'react';
import { useAccount } from 'wagmi';

interface EnhancedWalletProps {
  variant?: 'default' | 'modal' | 'island' | 'advanced';
  className?: string;
}

const variantClassNames: Record<NonNullable<EnhancedWalletProps['variant']>, string> = {
  default: '',
  modal: 'justify-center',
  island: 'rounded-lg border border-white/10 p-2 backdrop-blur-sm',
  advanced: 'justify-between gap-3'
};

const EnhancedWallet: React.FC<EnhancedWalletProps> = ({
  variant = 'default',
  className = ''
}) => {
  const { isConnected } = useAccount();
  const connectionState = isConnected ? 'connected' : 'disconnected';
  const variantStyles = variantClassNames[variant] ?? variantClassNames.default;

  // All variants use the same Reown AppKit button.
  // The modal behavior is controlled globally in OnchainProviders.
  return (
    <div
      className={`flex items-center ${variantStyles} ${className}`.trim()}
      data-state={connectionState}
      data-variant={variant}
    >
      <appkit-button data-variant={variant} data-state={connectionState} />
    </div>
  );
};

export default EnhancedWallet;
