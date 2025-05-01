import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = await fetch('https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  })

  const data = await result.json()
  res.status(200).json(data)
}
