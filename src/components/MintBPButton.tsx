import React, { useCallback, useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const isEndOfDay = useEndOfDayDisable();

  const {
    data: hash,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
    writeContract
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    calculateDay().then(setCurrentDay).catch(console.error);
  }, []);

  useEffect(() => {
    if (isConfirmed) {
      setIsTransactionComplete(true);
      setTimeout(() => {
        setIsTransactionComplete(false);
        resetEncodedState();
      }, 5000);
    }
  }, [isConfirmed, resetEncodedState]);

  const handleMint = useCallback(() => {
    if (!currentDay || !encodedData || !state.brushData) return;

    writeContract({
      address: '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83' as `0x${string}`,
      abi: BasePaintAbi,
      functionName: 'paint',
      args: [
        BigInt(currentDay),
        BigInt(state.brushData.tokenId || 0),
        `0x${encodedData}` as `0x${string}`
      ],
    });
  }, [currentDay, encodedData, state.brushData, writeContract]);

  if (!address || !currentDay) return null;

  const isProcessing = isWritePending || isConfirming;

  return (
    <div className="flex flex-col items-center gap-2">
      {(isWriteError || isConfirmError) && (
        <div className="w-full p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm mb-2">
          <p className="font-semibold">Error:</p>
          <p className="text-xs">{(writeError || confirmError)?.message || 'Error desconocido'}</p>
        </div>
      )}

      {!encodedData ? (
        <button
          onClick={onEncode}
          disabled={isEndOfDay}
          className={`py-2 px-4 rounded ${isEndOfDay
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
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                onClick={handleMint}
                disabled={isProcessing}
                className={`w-full py-2 px-4 rounded transition-all ${isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isWritePending ? 'Confirm in Wallet...' : isConfirming ? 'Minting...' : 'Mint BP'}
              </button>

              {isConfirming && (
                <p className="text-xs text-blue-600 animate-pulse">
                  Waiting for blockchain confirmation...
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-sm text-green-700 font-semibold">
            ✅ Transaction successful!
          </p>
          {hash && (
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              View on BaseScan →
            </a>
          )}
          <p className="text-xs text-gray-600 mt-1">
            Redirecting in 5 seconds...
          </p>
        </div>
      )}
    </div>
  );
};

export default MintBPButton;
