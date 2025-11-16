import React, { useEffect, useState } from 'react';
import { useAddressName } from '@/hooks/useAddressName';

interface AddressDisplayProps {
  /**
   * The Ethereum address to display
   */
  address?: string | null;
  
  /**
   * Fallback text if no address is provided
   * @default "—"
   */
  fallback?: string;
  
  /**
   * Additional CSS classes to apply
   */
  className?: string;
  
  /**
   * Whether to show a loading state
   * @default true
   */
  showLoading?: boolean;
}

/**
 * Component to display Ethereum addresses with automatic ENS/Basename resolution
 * 
 * Resolves addresses in the following priority:
 * 1. ENS name (from Ethereum mainnet)
 * 2. Basename (from Base L2)
 * 3. Shortened address (0x1234…5678)
 * 
 * @example
 * ```tsx
 * <AddressDisplay address="0x1234..." />
 * <AddressDisplay address={userAddress} className="font-mono" />
 * ```
 */
export const AddressDisplay: React.FC<AddressDisplayProps> = ({ 
  address, 
  fallback = '—',
  className = '',
  showLoading = true,
}) => {
  const { displayName, isLoading } = useAddressName(address);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (hasMounted && isLoading && showLoading) {
    return <span className={`animate-pulse ${className}`.trim()}>Loading…</span>;
  }

  return <span className={className}>{displayName || fallback}</span>;
};
