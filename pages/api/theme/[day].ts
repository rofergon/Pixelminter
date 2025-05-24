import { NextApiRequest, NextApiResponse } from 'next'
import { calculateDay } from '../../../src/hooks/useDateUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const numericDay = await calculateDay();

    

    // Establecer la zona horaria a UTC-10:00
    process.env.TZ = 'Pacific/Honolulu'

    // Construir las URLs de las APIs externas
    const themeUrl = `https://basepaint.xyz/api/theme/${numericDay}`
    const imageUrl = `https://basepaint.xyz/api/art/image?day=${numericDay}&scale=20&v=3`

    try {
      const themeResponse = await fetch(themeUrl)
      if (!themeResponse.ok) throw new Error('Failed to fetch theme data from API')
      const themeData = await themeResponse.json()

      // Combinar los datos del tema con la URL de la imagen
      const responseData = {
        ...themeData,
        imageUrl: imageUrl
      }

      res.status(200).json(responseData)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data from API', details: error instanceof Error ? error.message : 'Unknown error' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate day', details: error instanceof Error ? error.message : 'Unknown error' })
  }
}