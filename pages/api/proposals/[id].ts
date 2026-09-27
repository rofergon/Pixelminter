import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidProposalId, readProposal } from '@/utils/aiProposals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !isValidProposalId(id)) {
    return res.status(400).json({ error: 'Invalid proposal id' });
  }
  const proposal = await readProposal(id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(proposal);
}
