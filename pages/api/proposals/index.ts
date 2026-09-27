import type { NextApiRequest, NextApiResponse } from 'next';
import { listProposals } from '@/utils/aiProposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ proposals: await listProposals() });
}
