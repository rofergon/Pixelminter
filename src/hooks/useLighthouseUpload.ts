import { useState } from 'react';
import { Buffer } from 'buffer';

interface LighthouseResponse {
  data: {
    Name: string;
    Hash: string;
    Size: string;
  };
}

/**
 * Hook para subir archivos a Lighthouse/IPFS
 * Utiliza la API route del servidor para mantener la API key segura
 */
export const useLighthouseUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadToLighthouse = async (
    file: Blob,
    fileName = `pixelminter-${Date.now()}`
  ): Promise<LighthouseResponse> => {
    setUploading(true);
    try {
      // Convertir Blob a ArrayBuffer y luego a Base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      console.log('Uploading to Lighthouse via API route...');
      console.log('File name:', fileName);
      console.log('File type:', file.type);
      console.log('File size:', file.size, 'bytes');

      const response = await fetch('/api/lighthouse-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: base64Data,
          fileName,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error('Upload failed with status:', response.status);
        
        let errorMessage = 'Failed to upload to Lighthouse';
        try {
          const errorJson = JSON.parse(body);
          errorMessage = errorJson.error || errorMessage;
          if (errorJson.details) {
            errorMessage += ': ' + errorJson.details;
          }
        } catch {
          errorMessage = body || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const json = (await response.json()) as LighthouseResponse;
      
      if (!json?.data?.Hash) {
        console.error('Invalid response structure:', json);
        throw new Error('Invalid response from Lighthouse: missing Hash');
      }

      console.log('Upload successful!');
      console.log('IPFS Hash:', json.data.Hash);
      console.log('File name:', json.data.Name);
      console.log('Size:', json.data.Size);

      return json;
    } catch (error) {
      console.error('Lighthouse upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadToLighthouse, uploading };
};
