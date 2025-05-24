import { useState } from 'react';
import lighthouse from '@lighthouse-web3/sdk';

interface LighthouseResponse {
  data: {
    Name: string;
    Hash: string;
    Size: string;
  };
}

export const useLighthouseUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadToLighthouse = async (file: Blob): Promise<LighthouseResponse> => {
    setUploading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;
      if (!apiKey) {
        throw new Error('Lighthouse API key not found');
      }

      const response = await lighthouse.uploadBuffer(file, apiKey);
      console.log('Subida Exitosa. Respuesta completa:', response);

      if (!response || !response.data || !response.data.Hash) {
        throw new Error('Invalid response from Lighthouse');
      }

      return response as LighthouseResponse;
    } catch (error) {
      console.error('Error al subir a Lighthouse:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadToLighthouse, uploading };
};