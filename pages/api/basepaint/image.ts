import type { NextApiRequest, NextApiResponse } from 'next';
import { reconstructBasePaintImage } from '@/utils/basepaintImage';
import { calculateDay } from '@/hooks/useDateUtils';

const parsePaletteParam = (paletteParam: string | string[] | undefined): string[] => {
  if (!paletteParam) return [];
  const values = Array.isArray(paletteParam) ? paletteParam : [paletteParam];
  return values
    .flatMap((entry) => entry.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const palette = parsePaletteParam(req.query.palette as string | string[] | undefined);
    if (!palette.length) {
      return res.status(400).json({ error: 'Palette parameter is required' });
    }

    const dayParam = Array.isArray(req.query.day) ? req.query.day[0] : req.query.day;
    const parsedDay = dayParam ? parseInt(dayParam, 10) : NaN;
    const day = Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : await calculateDay();

    const scaleParam = Array.isArray(req.query.scale) ? req.query.scale[0] : req.query.scale;
    const parsedScale = scaleParam ? parseInt(scaleParam, 10) : undefined;

    const { buffer, metadata } = await reconstructBasePaintImage({
      day,
      palette,
      scale: parsedScale,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('x-basepaint-day', metadata.day.toString());
    res.setHeader('x-basepaint-pixels', metadata.pixelsFilled.toString());
    res.setHeader('x-basepaint-scale', metadata.scale.toString());
    res.send(buffer);
  } catch (error) {
    console.error('Failed to reconstruct BasePaint image:', error);
    res.status(500).json({
      error: 'Failed to reconstruct BasePaint image',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
