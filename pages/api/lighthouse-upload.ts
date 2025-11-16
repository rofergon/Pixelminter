import type { NextApiRequest, NextApiResponse } from 'next';
import lighthouse from '@lighthouse-web3/sdk';
import { Buffer } from 'buffer';

type LighthouseResponse = {
  data: {
    Name: string;
    Hash: string;
    Size: string;
  };
};

type ErrorResponse = {
  error: string;
  details?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LighthouseResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  
  if (!apiKey) {
    console.error('Lighthouse API key not found in environment variables');
    return res.status(500).json({ error: 'Lighthouse API key not configured' });
  }

  const { data, fileName, mimeType } = req.body as { data?: string; fileName?: string; mimeType?: string };
  if (!data) {
    console.error('Missing file data in request');
    return res.status(400).json({ error: 'Missing file data' });
  }

  console.log('Uploading file to Lighthouse:', fileName || 'unnamed');

  try {
    // Convertir base64 a buffer
    const buffer = Buffer.from(data, 'base64');
    console.log('Buffer size:', buffer.length, 'bytes');
    
    // Usar uploadBuffer con los parámetros correctos según la documentación:
    // uploadBuffer(buffer: any, apiKey: string, cidVersion?: number)
    const uploadResponse = await lighthouse.uploadBuffer(
      buffer,
      apiKey
    ) as LighthouseResponse;

    console.log('Lighthouse response:', uploadResponse);

    if (!uploadResponse?.data?.Hash) {
      console.error('Invalid response from Lighthouse:', uploadResponse);
      return res.status(502).json({ error: 'Invalid response from Lighthouse' });
    }

    console.log('Upload successful, Hash:', uploadResponse.data.Hash);
    return res.status(200).json(uploadResponse);
  } catch (error) {
    console.error('Lighthouse upload failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload to Lighthouse';
    return res.status(500).json({ 
      error: 'Failed to upload to Lighthouse',
      details: errorMessage
    });
  }
}
