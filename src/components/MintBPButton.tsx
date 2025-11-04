import React, { useCallback, useState, useEffect } from 'react';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { useAccount } from 'wagmi';
import { BasePaintAbi } from '../abi/BasePaintAbi';
import { State } from '../types/types';
import { calculateDay } from '../hooks/useDateUtils';
import { useEndOfDayDisable } from '../hooks/useEndOfDayDisable';

interface MintBPButtonProps {
  state: State;
  encodedData: string;
  onEncode: () => void;
  resetEncodedState: () => void;
}

const MintBPButton: React.FC<MintBPButtonProps> = ({
  state,
  encodedData,
  onEncode,
  resetEncodedState,
}) => {
  const { address } = useAccount();
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [key, setKey] = useState<number>(0);
  const isEndOfDay = useEndOfDayDisable();

  useEffect(() => {
    calculateDay().then(setCurrentDay).catch(console.error);
  }, []);

  const handleOnStatus = useCallback((status: LifecycleStatus) => {
    setTransactionStatus(status.statusName);
    if (status.statusName === 'success') {
      setTxHash(status.statusData.transactionReceipts[0].transactionHash);
      setIsTransactionComplete(true);

      setTimeout(() => {
        setIsTransactionComplete(false);
        setTransactionStatus('');
        setTxHash(null);
        setKey(prevKey => prevKey + 1);
        resetEncodedState(); // Resetear el estado codificado
      }, 5000);
    }
  }, [resetEncodedState]);

  const contracts = currentDay && encodedData ? [
    {
      address: '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83' as `0x${string}`,
      abi: BasePaintAbi,
      functionName: 'paint',
      args: [
        BigInt(currentDay).toString(), 
        BigInt(state.brushData?.tokenId || 0).toString(), 
        `0x${encodedData}` as `0x${string}`
      ],
    },
  ] : [];

  if (!address || !currentDay) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {!encodedData ? (
        <button
          onClick={onEncode}
          disabled={isEndOfDay}
          className={`py-2 px-4 rounded ${
            isEndOfDay 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          title={isEndOfDay ? 'Minting disabled during the last 15 minutes of the day' : ''}
        >
          Encode BP
        </button>
      ) : !isTransactionComplete ? (
        <>
          {isEndOfDay ? (
            <div className="flex flex-col items-center gap-2 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ Minting disabled
              </p>
              <p className="text-xs text-yellow-700 text-center">
                Commits to BasePaint are disabled during the last 15 minutes of the day (11:25 AM - 11:40 AM Colombia time)
              </p>
            </div>
          ) : (
            <Transaction
              key={key}
              chainId={8453}
              contracts={contracts}
              onStatus={handleOnStatus}
            >
              <TransactionButton text="Mint BP" />
              <TransactionStatus>
                <TransactionStatusLabel />
                {transactionStatus !== 'success' && <TransactionStatusAction />}
              </TransactionStatus>
            </Transaction>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600">
            Transaction successful. You can encode and mint another BP in 5 seconds.
          </p>
          {txHash && (
            <p className="text-sm text-gray-600">
              Transaction Hash: {txHash}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MintBPButton;