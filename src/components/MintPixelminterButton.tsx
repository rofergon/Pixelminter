import React, { useCallback, useState, useEffect } from 'react';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { useAccount, useContractRead } from 'wagmi';
import { pixelminterAbi } from '../abi/pixelminterAbi';
import { State } from '../types/types';
import { useExportGif } from '../hooks/animation/useExportGif';
import { useLighthouseUpload } from '../hooks/useLighthouseUpload';

interface MintPixelminterButtonProps {
  state: State;
  fps?: number;
}

const CONTRACT_ADDRESS = '0x162ee7D340439C181394E1A7B4fdD922B20115D5' as const;
const SEPOLIA_CHAIN_ID = 11155111;

const MintPixelminterButton: React.FC<MintPixelminterButtonProps> = ({ state, fps = 30 }) => {
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [isTransactionComplete, setIsTransactionComplete] = useState(false);
  const [key, setKey] = useState<number>(0);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintFee, setMintFee] = useState<bigint>(BigInt(0));

  const { exportGif, isExporting } = useExportGif(state, fps);
  const { uploadToLighthouse, uploading } = useLighthouseUpload();

  // Leer el fee de minteo del contrato en Sepolia
  const { data: mintFeeData } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: pixelminterAbi,
    functionName: 'getMintFee',
    chainId: SEPOLIA_CHAIN_ID,
  });

  useEffect(() => {
    if (mintFeeData) {
      setMintFee(BigInt(mintFeeData.toString()));
    }
  }, [mintFeeData]);

  const handleOnStatus = useCallback((status: LifecycleStatus) => {
    console.log('Estado de la transacción:', status);
    setTransactionStatus(status.statusName);
    if (status.statusName === 'success') {
      console.log('Transacción exitosa:', status.statusData);
      setTxHash(status.statusData.transactionReceipts[0].transactionHash);
      setIsTransactionComplete(true);

      setTimeout(() => {
        setIsTransactionComplete(false);
        setTransactionStatus('');
        setTxHash(null);
        setKey(prevKey => prevKey + 1);
        setIpfsHash(null);
      }, 5000);
    } else if (status.statusName === 'error') {
      console.error('Error en la transacción:', status.statusData);
      setError(`Error in transaction: ${status.statusData.message || 'Unknown'}`);
    }
  }, []);

  const prepareAndMint = async () => {
    if (isExporting || uploading) return;
    setError(null);

    try {
      console.log('Starting preparation and minting process');
      const gifBlob = await exportGif();
      console.log("GIF Exported:", gifBlob);

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
          setIpfsHash(`ipfs://${metadataCID}`);
        } else {
          throw new Error('No se pudo obtener el CID de los metadatos de Lighthouse');
        }
      } else {
        throw new Error('No se pudo obtener el CID del GIF de Lighthouse');
      }
    } catch (error) {
      console.error('Error al preparar para el minteo:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const contracts = ipfsHash ? [
    {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: pixelminterAbi,
      functionName: 'mintNFT',
      args: [
        address as `0x${string}`,
        ipfsHash // CID de los metadatos JSON
      ],
      value: mintFee,
    },
  ] : [];

  if (!address) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!ipfsHash ? (
        <button
          onClick={prepareAndMint}
          className="w-full action-button bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded transition-colors duration-300"
          disabled={isExporting || uploading}
        >
          {isExporting ? 'Exporting GIF...' : uploading ? 'Loading...' : 'Mint animation WIP'}
        </button>
      ) : !isTransactionComplete ? (
        <Transaction
          key={key}
          chainId={SEPOLIA_CHAIN_ID}
          contracts={contracts}
          onStatus={handleOnStatus}
        >
          <TransactionButton 
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 px-4 rounded transition-colors duration-300"
            text="Mint animation WIP" 
          />
          <TransactionStatus>
            <TransactionStatusLabel />
            {transactionStatus !== 'success' && <TransactionStatusAction />}
          </TransactionStatus>
        </Transaction>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600">
            Transaction successful. You can mint another NFT in 5 seconds.
          </p>
          {txHash && (
            <p className="text-sm text-gray-600">
              Transaction hash: {txHash}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MintPixelminterButton;
