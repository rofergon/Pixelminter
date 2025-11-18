import { NextApiRequest, NextApiResponse } from 'next'
import { calculateDay, getBasePaintDayMetadata } from '../../../src/hooks/useDateUtils';

const DEFAULT_SCALE = 20;
const REMOTE_IMAGE_BASE = 'https://basepaint.xyz/api/art/image';

const sanitizePalette = (palette: unknown): string[] => {
  if (!Array.isArray(palette)) return [];
  return palette
    .map((color) => (typeof color === 'string' ? color.trim() : ''))
    .filter((color): color is string => Boolean(color));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const pathDay = Array.isArray(req.query.day) ? req.query.day[0] : req.query.day;
    const parsedPathDay = pathDay ? parseInt(pathDay, 10) : NaN;
    const numericDay = Number.isFinite(parsedPathDay) && parsedPathDay > 0 ? parsedPathDay : await calculateDay();

    // Metadata is stored on-chain in BasePaintMetadataRegistry
    const metadata = await getBasePaintDayMetadata(numericDay);

    if (!metadata || !metadata.palette.length) {
      return res.status(404).json({
        error: 'Metadata not found for requested day',
      });
    }

    const palette = sanitizePalette(metadata.palette);

    const paletteQuery = palette.map((color) => encodeURIComponent(color)).join(',');
    const reconstructedImageUrl = palette.length
      ? `/api/basepaint/image?day=${numericDay}&scale=${DEFAULT_SCALE}&palette=${paletteQuery}`
      : '';
    const remoteImageUrl = `${REMOTE_IMAGE_BASE}?day=${numericDay}&scale=${DEFAULT_SCALE}&v=3`;
    const selectedImageUrl = reconstructedImageUrl || remoteImageUrl;

    res.status(200).json({
      day: numericDay,
      theme: metadata.name || `BasePaint Day ${numericDay}`,
      palette,
      imageUrl: selectedImageUrl,
      canvasSize: metadata.size,
      proposer: metadata.proposer,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch BasePaint metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
