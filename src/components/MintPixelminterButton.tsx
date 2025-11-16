import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useEnsName } from 'wagmi';
import { pixelminterAbi } from '../abi/pixelminterAbi';
import { State } from '../types/types';
import { useExportGif } from '../hooks/animation/useExportGif';
import { useLighthouseUpload } from '../hooks/useLighthouseUpload';
import { PIXELMINTER_CHAIN_ID, PIXELMINTER_CONTRACT_ADDRESS } from '@/constants/pixelminter';

interface MintPixelminterButtonProps {
  state: State;
  fps?: number;
}

interface MintSummary {
  tokenURI: string;
  gifUrl: string;
  name: string;
  theme: string;
  fpsValue: number;
  framesCount: number;
  totalPixels: number;
}

const MintPixelminterButton: React.FC<MintPixelminterButtonProps> = ({ state, fps = 30 }) => {
  const { address } = useAccount();
  const { data: ensName } = useEnsName({
    address,
  });
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingMint, setIsPreparingMint] = useState(false);
  const [pendingMintSummary, setPendingMintSummary] = useState<MintSummary | null>(null);
  const [mintSuccessData, setMintSuccessData] = useState<MintSummary | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { exportGif, isExporting } = useExportGif(state, fps);
  const { uploadToLighthouse, uploading } = useLighthouseUpload();

  // Leer el fee de minteo del contrato en Base Mainnet
  const { data: mintFeeData } = useReadContract({
    address: PIXELMINTER_CONTRACT_ADDRESS,
    abi: pixelminterAbi,
    functionName: 'getMintFee',
    chainId: PIXELMINTER_CHAIN_ID,
  });

  // Hook para escribir en el contrato
  const { 
    data: hash, 
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
    writeContract 
  } = useWriteContract();

  // Hook para esperar la confirmación de la transacción
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    isError: isConfirmError,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Efectos para manejar errores y éxito
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('Error al escribir en el contrato:', writeError);
      setError(writeError.message || 'Error desconocido al enviar transacción');
      setIsPreparingMint(false);
      setIpfsHash(null); // Resetear para poder intentar de nuevo
    }
  }, [isWriteError, writeError]);

  useEffect(() => {
    if (isConfirmError && confirmError) {
      console.error('Error al confirmar la transacción:', confirmError);
      setError(confirmError.message || 'Error desconocido al confirmar transacción');
      setIsPreparingMint(false);
      setIpfsHash(null); // Resetear para poder intentar de nuevo
      setPendingMintSummary(null);
    }
  }, [isConfirmError, confirmError]);

  useEffect(() => {
    if (isConfirmed && pendingMintSummary) {
      console.log('✅ Transacción confirmada exitosamente!');
      console.log('Hash:', hash);
      setMintSuccessData(pendingMintSummary);
      setIsSuccessModalOpen(true);
      setPendingMintSummary(null);
      
      // Reset state after 5 seconds
      setTimeout(() => {
        setIpfsHash(null);
        setIsPreparingMint(false);
        setError(null);
      }, 5000);
    }
  }, [isConfirmed, hash, pendingMintSummary]);

  const closeSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setMintSuccessData(null);
  };

  const prepareAndMint = async () => {
    if (isExporting || uploading || isPreparingMint) return;
    setError(null);
    setIsPreparingMint(true);
    setMintSuccessData(null);
    setIsSuccessModalOpen(false);

    try {
      console.log('=== Starting preparation and minting process ===');
      console.log('Current address:', address);
      console.log('Current mint fee:', mintFeeData?.toString());
      
      const gifBlob = await exportGif();
      console.log("GIF Exported:", gifBlob);
      console.log("GIF size:", gifBlob.size, "bytes");
      console.log("GIF type:", gifBlob.type);

      const gifUploadResponse = await uploadToLighthouse(gifBlob, 'pixelminter-animation.gif');
      console.log("Lighthouse response for GIF:", gifUploadResponse);

      if (gifUploadResponse && gifUploadResponse.data && gifUploadResponse.data.Hash) {
        const gifCID = gifUploadResponse.data.Hash;
        console.log("GIF CID obtained:", gifCID);
        const gifGatewayUrl = `https://gateway.lighthouse.storage/ipfs/${gifCID}`;

        const paletteColors = state.customPalette.length > 0 ? state.customPalette : state.palette;
        const totalPixels = state.frames.reduce((frameAcc, frame) => {
          const framePixels = frame.layers.reduce((layerAcc, layer) => layerAcc + layer.pixels.size, 0);
          return frameAcc + framePixels;
        }, 0);
        const framesCount = state.frames.length;
        const fpsValue = state.fps ?? fps;
        const creationDate = new Date().toISOString().split('T')[0];
        const authorIdentity = ensName ?? address ?? "Unknown";
        const attributes = [
          {
            trait_type: "FPS",
            value: fpsValue,
            display_type: "number",
          },
          {
            trait_type: "Total Pixels",
            value: totalPixels,
            display_type: "number",
          },
          {
            trait_type: "Theme",
            value: state.theme || "Untitled",
          },
          {
            trait_type: "Author",
            value: authorIdentity,
          },
          {
            trait_type: "Palette",
            value: paletteColors.length ? paletteColors.join(',') : "N/A",
          },
          {
            trait_type: "Frame Count",
            value: framesCount,
            display_type: "number",
          },
          {
            trait_type: "Creation Date",
            value: creationDate,
          },
        ];

        if (state.day !== null && state.day !== undefined) {
          attributes.push({
            trait_type: "Day",
            value: state.day,
            display_type: "number",
          });
        }

        // Crear metadatos JSON
        const metadata = {
          name: state.theme ? `Pixelminter – ${state.theme}` : `Pixelminter #${Date.now()}`,
          description: state.theme
            ? `Animated pixel art inspired by "${state.theme}".`
            : "Animated pixel art created on Pixelminter.",
          image: `ipfs://${gifCID}`,
          animation_url: `ipfs://${gifCID}`,
          external_url: "https://pixelminter.xyz",
          attributes,
        };

        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        console.log("JSON Metadata created:", metadata);

        const metadataUploadResponse = await uploadToLighthouse(
          metadataBlob,
          'pixelminter-metadata.json'
        );
        console.log("Lighthouse response for Metadata:", metadataUploadResponse);

        if (metadataUploadResponse && metadataUploadResponse.data && metadataUploadResponse.data.Hash) {
          const metadataCID = metadataUploadResponse.data.Hash;
          console.log("Metadata CID obtained:", metadataCID);
          const tokenURI = `ipfs://${metadataCID}`;
          console.log("Token URI completo:", tokenURI);
          console.log("=== Ready to mint with params ===");
          console.log("Recipient:", address);
          console.log("Token URI:", tokenURI);
          console.log("Mint fee:", mintFeeData?.toString(), "wei");
          
          // Guardar la URI completa de IPFS
          setIpfsHash(tokenURI);
          setPendingMintSummary({
            tokenURI,
            gifUrl: gifGatewayUrl,
            name: metadata.name,
            theme: state.theme || 'Untitled',
            fpsValue,
            framesCount,
            totalPixels,
          });
          // Unlock preparation state
          setIsPreparingMint(false);
        } else {
          throw new Error('Could not obtain metadata CID from Lighthouse');
        }
      } else {
        throw new Error('Could not obtain GIF CID from Lighthouse');
      }
    } catch (error) {
      console.error('Error preparing for minting:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setIsPreparingMint(false);
      setPendingMintSummary(null);
      setMintSuccessData(null);
    }
  };

  const handleMint = useCallback(() => {
    if (!ipfsHash || !address) {
      const missingFields: string[] = [];
      if (!ipfsHash) missingFields.push('token metadata (ipfsHash)');
      if (!address) missingFields.push('wallet address');

      setError(
        `Missing data to mint: ${missingFields.join(
          ', '
        )}. Please wait for the upload to finish and try again.`
      );
      setIsPreparingMint(false);
      return;
    }

    const resolvedMintFee = (mintFeeData ?? BigInt(0)) as bigint;

    console.log('=== Starting minting with Wagmi ===');
    console.log('Contract:', PIXELMINTER_CONTRACT_ADDRESS);
    console.log('Recipient:', address);
    console.log('Token URI:', ipfsHash);
    console.log('Mint Fee:', resolvedMintFee.toString(), 'wei');

    try {
      writeContract({
        address: PIXELMINTER_CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelminterAbi,
        functionName: 'mintNFT',
        args: [address as `0x${string}`, ipfsHash],
        value: resolvedMintFee,
      });
    } catch (err) {
      console.error('Error calling writeContract:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsPreparingMint(false);
      setIpfsHash(null);
    }
  }, [address, ipfsHash, mintFeeData, writeContract]);

  // Auto-mint when IPFS upload completes
  useEffect(() => {
    if (ipfsHash && !hash && !isWritePending && !isConfirming && !isConfirmed) {
      console.log('🚀 Auto-iniciando minteo...');
      handleMint();
    }
  }, [handleMint, hash, ipfsHash, isConfirming, isConfirmed, isWritePending]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!address) return null;

  const isProcessing = isExporting || uploading || isPreparingMint || isWritePending || isConfirming;
  const showMintButton = ipfsHash && !isConfirmed && !isWritePending && !isConfirming;

  return (
    <div className="flex flex-col items-center gap-2">
      {error && (
        <div className="w-full p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          <p className="font-semibold">Error:</p>
          <p className="text-xs mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIpfsHash(null);
              setIsPreparingMint(false);
              setPendingMintSummary(null);
            }}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
      
      {!ipfsHash && !isConfirmed ? (
        <button
          onClick={prepareAndMint}
          className="group relative w-full overflow-hidden px-0 py-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          disabled={isProcessing}
          style={{
            filter: isProcessing ? 'none' : 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.4))'
          }}
        >
          {/* Pixel Art Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 rounded-lg" 
               style={{
                 padding: '3px',
                 clipPath: 'polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))'
               }}>
          </div>
          
          {/* Main Button Content */}
          <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 px-5 py-4 rounded-lg"
               style={{
                 clipPath: 'polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))',
                 boxShadow: 'inset 0 2px 0 rgba(168, 85, 247, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.5)'
               }}>
            
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                 style={{
                   backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)',
                   backgroundSize: '8px 8px',
                   animation: 'pixelGridMove 20s linear infinite'
                 }}>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-30">
              <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                   style={{
                     animation: 'scanline 3s linear infinite',
                     boxShadow: '0 0 8px rgba(168, 85, 247, 0.8)'
                   }}>
              </div>
            </div>
            
            <div className="relative flex flex-col gap-1.5 text-left">
              {isExporting ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">🎨</span>
                  <div>
                    <span className="block text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-300 pixel-perfect uppercase tracking-wider" 
                          style={{ 
                            textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em'
                          }}>
                      Exporting GIF...
                    </span>
                    <span className="text-xs text-purple-300/70 font-mono">Processing your pixel art</span>
                  </div>
                </div>
              ) : uploading ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-pulse">☁️</span>
                  <div>
                    <span className="block text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 pixel-perfect uppercase tracking-wider" 
                          style={{ 
                            textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em'
                          }}>
                      Uploading to IPFS...
                    </span>
                    <span className="text-xs text-cyan-300/70 font-mono">Saving to decentralized storage</span>
                  </div>
                </div>
              ) : isPreparingMint ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-spin">⚙️</span>
                  <div>
                    <span className="block text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-300 to-yellow-300 pixel-perfect uppercase tracking-wider" 
                          style={{ 
                            textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
                            fontFamily: 'monospace',
                            letterSpacing: '0.1em'
                          }}>
                      Preparing Mint...
                    </span>
                    <span className="text-xs text-orange-300/70 font-mono">Getting ready for blockchain</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-2.5 text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-200 pixel-perfect uppercase tracking-wider group-hover:from-purple-100 group-hover:via-fuchsia-100 group-hover:to-pink-100 transition-all" 
                        style={{ 
                          textShadow: '3px 3px 0 rgba(0,0,0,0.7), 0 0 20px rgba(168, 85, 247, 0.5)',
                          fontFamily: 'monospace',
                          letterSpacing: '0.15em'
                        }}>
                    <span className="text-2xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">✨</span>
                    MINT GIF NFT
                  </span>
                  <span className="text-xs text-purple-200/80 font-mono tracking-wide" 
                        style={{ 
                          textShadow: '1px 1px 0 rgba(0,0,0,0.7)' 
                        }}>
                    → Free mint on Base • Animated BasePaint Wip 
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} 
                             className="w-2 h-2 rounded-sm bg-gradient-to-br from-purple-400 to-fuchsia-500"
                             style={{
                               animation: `pixelBlink ${1.5 + i * 0.3}s ease-in-out infinite`,
                               boxShadow: '0 0 4px rgba(168, 85, 247, 0.8)'
                             }}>
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-purple-300/60 font-mono uppercase tracking-widest">
                      Pixelminter • Base Chain
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </button>
      ) : showMintButton ? (
        <div className="w-full flex flex-col gap-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <p className="font-semibold">✅ Upload ready</p>
            <p className="text-xs mt-1">Opening your wallet to sign...</p>
          </div>
        </div>
      ) : (isWritePending || isConfirming) && !isConfirmed ? (
        <div className="w-full flex flex-col gap-2">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <p className="font-semibold">
              {isWritePending ? '👛 Confirm in your wallet...' : '⏳ Waiting for confirmation...'}
            </p>
            <p className="text-xs mt-1">
              {isWritePending 
                ? 'Check your wallet extension' 
                : 'Transaction is being processed'}
            </p>
          </div>
          
          {hash && (
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 text-center underline"
            >
              View transaction on BaseScan →
            </a>
          )}
        </div>
      ) : isConfirmed ? (
        <div className="w-full flex flex-col items-center gap-2 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-sm text-green-700 font-semibold">
            ✅ NFT minted successfully!
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
          <p className="text-xs text-gray-600 mt-2">
            You can mint another one in ~5 seconds...
          </p>
        </div>
      ) : null}

      {isClient && isSuccessModalOpen && mintSuccessData &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur">
            <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-white shadow-[0_0_90px_rgba(236,72,153,0.45)]">
              <button
                onClick={closeSuccessModal}
                className="absolute right-4 top-4 text-white/70 hover:text-white text-sm uppercase tracking-[0.2em]"
              >
                Close
              </button>
              <div className="space-y-6 pt-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Mint confirmed</p>
                  <h3 className="mt-2 text-2xl font-semibold">Your animation is live on Base</h3>
                  <p className="text-sm text-slate-300">
                    Share it with friends or jump into the gallery to keep your collection growing.
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 shadow-inner">
                  <div className="aspect-video bg-slate-900/60 flex items-center justify-center">
                    <img
                      src={mintSuccessData.gifUrl}
                      alt={mintSuccessData.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">Pixelminter</p>
                    <h4 className="text-xl font-semibold">{mintSuccessData.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <div>
                        <p className="text-slate-500">Theme</p>
                        <p className="font-mono text-white">{mintSuccessData.theme}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">FPS</p>
                        <p className="font-mono text-white">{mintSuccessData.fpsValue}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Frames</p>
                        <p className="font-mono text-white">{mintSuccessData.framesCount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pixels</p>
                        <p className="font-mono text-white">{mintSuccessData.totalPixels}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/library"
                    className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-4 py-3 text-center text-sm font-semibold shadow-lg shadow-fuchsia-500/40 transition hover:shadow-fuchsia-500/60"
                    onClick={closeSuccessModal}
                  >
                    Visit the NFT gallery
                  </Link>
                  {hash && (
                    <a
                      href={`https://basescan.org/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white/90 transition hover:border-white/50"
                    >
                      View on BaseScan
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MintPixelminterButton;
