import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tokenId } = req.query

  if (typeof tokenId !== 'string') {
    return res.status(400).json({ error: 'Token ID inválido' })
  }

  const brushUrl = `https://basepaint.xyz/api/brush/${tokenId}`

  try {
    const response = await fetch(brushUrl)
    if (!response.ok) throw new Error('Error al obtener datos del pincel')
    const brushData = await response.json()

    res.status(200).json(brushData)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos del pincel', details: error instanceof Error ? error.message : 'Error desconocido' })
  }
}