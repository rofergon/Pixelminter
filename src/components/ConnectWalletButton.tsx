/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { BrushData } from '@/types/types';
import { useBrushData } from '@/hooks/tools/useBrushData';

const ConnectWalletButton: React.FC<{ updateBrushData: (data: BrushData | null) => void }> = ({ updateBrushData }) => {
  const { address } = useAccount();
  const { brushData, isSearching, setManualTokenId } = useBrushData();
  const [showManualInput, setShowManualInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brushData) {
      updateBrushData(brushData);
    }
  }, [brushData, updateBrushData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number.parseInt(inputValue.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Invalid token ID');
      return;
    }

    const saved = setManualTokenId(parsed);
    if (!saved) {
      setError('Could not save token ID');
      return;
    }

    setError(null);
    setInputValue('');
    setShowManualInput(false);
  };

  const needsManualEntry = Boolean(address) && !brushData;

  return (
    <div className="flex flex-col items-end gap-2 w-full">
      <div className="flex items-center justify-end flex-shrink-0 w-full">
        {/* Reown AppKit Web Component con estilos mejorados */}
        <div className="wallet-button-container">
          <appkit-button balance="hide" />
        </div>
      </div>

      {needsManualEntry && !showManualInput && (
        <button
          type="button"
          onClick={() => setShowManualInput(true)}
          className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors"
        >
          {isSearching ? 'Searching brush... enter ID manually' : 'Enter brush token ID manually'}
        </button>
      )}

      {needsManualEntry && showManualInput && (
        <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full">
          <input
            type="number"
            min={1}
            step={1}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              setError(null);
            }}
            placeholder="Token ID"
            autoFocus
            className="w-full min-w-0 h-7 px-2 text-xs font-mono bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="h-7 px-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 border border-slate-600 rounded-lg transition-colors flex-shrink-0"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setShowManualInput(false);
              setError(null);
              setInputValue('');
            }}
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-200 flex-shrink-0"
          >
            ✕
          </button>
        </form>
      )}

      {needsManualEntry && error && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
};

export default ConnectWalletButton;
