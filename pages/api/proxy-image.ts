import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    })

    const contentType = response.headers['content-type']
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
    res.send(response.data)
  } catch (error) {
    console.error('Error proxying image:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
}