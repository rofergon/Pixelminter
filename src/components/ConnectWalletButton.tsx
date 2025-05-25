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
import { Moon, Sun, CircleUserIcon } from "lucide-react";

const DefaultAvatar = () => (
  <div className="h-5 w-5 bg-gray-300 rounded-full flex items-center justify-center">
    <span className="text-[10px] text-gray-600">?</span>
  </div>
);

const LoadingAvatar = () => (
  <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
);

const ConnectWalletButton: React.FC<{ updateBrushData: (data: BrushData | null) => void }> = ({ updateBrushData }) => {
  const { userTokenIds, brushData, isLoading, balance } = useBrushData();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    if (brushData) {
      updateBrushData(brushData);
    }
  }, [brushData, updateBrushData]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <div className="flex justify-end">
      <Wallet>
        <ConnectWallet
          className="h-8 text-sm font-medium py-1 px-3 rounded-md transition-colors duration-200 bg-[var(--bg-ock-primary)] hover:bg-[var(--bg-ock-primary-hover)] active:bg-[var(--bg-ock-primary-active)] text-[var(--text-ock-inverse)] flex items-center"
          text="Connect Wallet"
        >
          <Avatar
            className="h-5 w-5 mr-2"
            defaultComponent={<DefaultAvatar />}
            loadingComponent={<LoadingAvatar />}
          />
          <Name className="text-[var(--text-ock-inverse)] flex items-center" />
        </ConnectWallet>

        <WalletDropdown className="rounded-xl shadow bg-[var(--bg-ock-dropdown)] hover:bg-[var(--bg-ock-dropdown-hover)]">
          <Identity
            className="px-8 pt-10 pb-2"
            hasCopyAddressOnClick
            schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
          >
            <Avatar
              className="h-10 w-10"
              defaultComponent={<DefaultAvatar />}
              loadingComponent={<LoadingAvatar />}
            >
              <Badge />
            </Avatar>
            <Name />
            <Address />
            <EthBalance />
            {!isLoading && balance && (
              <div className="text-[var(--text-ock-foreground-muted)]">
                Balance: {balance.toString()}
              </div>
            )}
            {!isLoading && userTokenIds.length > 0 && (
              <div className="text-[var(--text-ock-foreground-muted)]">
                Token IDs: {userTokenIds.join(', ')}
              </div>
            )}
            {brushData && (
              <div className="text-[var(--text-ock-foreground-muted)]">
                Token ID: {brushData.tokenId}, Pixels per day: {brushData.pixelsPerDay}
              </div>
            )}
          </Identity>

          <WalletDropdownBasename />

          <WalletDropdownDisconnect className="px-4 py-2" />
        </WalletDropdown>
      </Wallet>
    </div>
  );
};

export default ConnectWalletButton;