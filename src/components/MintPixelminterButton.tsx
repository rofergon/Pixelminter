import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { pixelminterAbi } from '../abi/pixelminterAbi';
import { State } from '../types/types';
import { useExportGif } from '../hooks/animation/useExportGif';
import { useLighthouseUpload } from '../hooks/useLighthouseUpload';
import { PIXELMINTER_CHAIN_ID, PIXELMINTER_CONTRACT_ADDRESS } from '@/constants/pixelminter';

interface MintPixelminterButtonProps {
  state: State;
  fps?: number;
}

const MintPixelminterButton: React.FC<MintPixelminterButtonProps> = ({ state, fps = 30 }) => {
  const { address } = useAccount();
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingMint, setIsPreparingMint] = useState(false);

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
    }
  }, [isConfirmError, confirmError]);

  useEffect(() => {
    if (isConfirmed) {
      console.log('✅ Transacción confirmada exitosamente!');
      console.log('Hash:', hash);
      
      // Resetear el estado después de 5 segundos
      setTimeout(() => {
        setIpfsHash(null);
        setIsPreparingMint(false);
        setError(null);
      }, 5000);
    }
  }, [isConfirmed, hash]);

  const prepareAndMint = async () => {
    if (isExporting || uploading || isPreparingMint) return;
    setError(null);
    setIsPreparingMint(true);

    try {
      console.log('=== Starting preparation and minting process ===');
      console.log('Current address:', address);
      console.log('Current mint fee:', mintFeeData?.toString());
      
      const gifBlob = await exportGif();
      console.log("GIF Exported:", gifBlob);
      console.log("GIF size:", gifBlob.size, "bytes");
      console.log("GIF type:", gifBlob.type);

      const gifUploadResponse = await uploadToLighthouse(gifBlob, 'pixelminter-animation.gif');
      console.log("Respuesta de Lighthouse para GIF:", gifUploadResponse);

      if (gifUploadResponse && gifUploadResponse.data && gifUploadResponse.data.Hash) {
        const gifCID = gifUploadResponse.data.Hash;
        console.log("GIF CID obtained:", gifCID);

        const paletteColors = state.customPalette.length > 0 ? state.customPalette : state.palette;
        const totalPixels = state.frames.reduce((frameAcc, frame) => {
          const framePixels = frame.layers.reduce((layerAcc, layer) => layerAcc + layer.pixels.size, 0);
          return frameAcc + framePixels;
        }, 0);
        const framesCount = state.frames.length;
        const fpsValue = state.fps ?? fps;
        const creationDate = new Date().toISOString().split('T')[0];
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
            value: address || "Unknown",
          },
          {
            trait_type: "Palette",
            value: paletteColors.length ? paletteColors.join(',') : "N/A",
          },
          {
            trait_type: "Grid Size",
            value: state.gridSize,
            display_type: "number",
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
          {
            trait_type: "Animation Type",
            value: framesCount > 1 ? "Loop" : "Single Frame",
          },
        ];

        if (state.day !== null && state.day !== undefined) {
          attributes.push({
            trait_type: "Day",
            value: state.day,
            display_type: "number",
          });
        }

        if (typeof state.pixelsPerDay === 'number') {
          attributes.push({
            trait_type: "Pixels Per Day",
            value: state.pixelsPerDay,
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
        console.log("Metadatos JSON creados:", metadata);

        const metadataUploadResponse = await uploadToLighthouse(
          metadataBlob,
          'pixelminter-metadata.json'
        );
        console.log("Respuesta de Lighthouse para Metadatos:", metadataUploadResponse);

        if (metadataUploadResponse && metadataUploadResponse.data && metadataUploadResponse.data.Hash) {
          const metadataCID = metadataUploadResponse.data.Hash;
          console.log("CID de los Metadatos obtenido:", metadataCID);
          const tokenURI = `ipfs://${metadataCID}`;
          console.log("Token URI completo:", tokenURI);
          console.log("=== Ready to mint with params ===");
          console.log("Recipient:", address);
          console.log("Token URI:", tokenURI);
          console.log("Mint fee:", mintFeeData?.toString(), "wei");
          
          // Guardar la URI completa de IPFS
          setIpfsHash(tokenURI);
          // Desbloquear el estado de preparación
          setIsPreparingMint(false);
        } else {
          throw new Error('No se pudo obtener el CID de los metadatos de Lighthouse');
        }
      } else {
        throw new Error('No se pudo obtener el CID del GIF de Lighthouse');
      }
    } catch (error) {
      console.error('Error al preparar para el minteo:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setIsPreparingMint(false);
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

    console.log('=== Iniciando minteo con Wagmi ===');
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
      console.error('Error al llamar writeContract:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsPreparingMint(false);
      setIpfsHash(null);
    }
  }, [address, ipfsHash, mintFeeData, writeContract]);

  // Auto-mintear cuando se complete la subida a IPFS
  useEffect(() => {
    if (ipfsHash && !hash && !isWritePending && !isConfirming && !isConfirmed) {
      console.log('🚀 Auto-iniciando minteo...');
      handleMint();
    }
  }, [handleMint, hash, ipfsHash, isConfirming, isConfirmed, isWritePending]);

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
          className="w-full action-button bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isProcessing}
        >
          {isExporting ? '🎨 Exporting GIF...' : 
           uploading ? '☁️ Uploading to IPFS...' : 
           isPreparingMint ? '⚙️ Preparing...' :
           'Mint NFT'}
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
    </div>
  );
};

export default MintPixelminterButton;
