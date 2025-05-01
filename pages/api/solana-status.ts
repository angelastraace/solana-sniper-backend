import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rpcUrl = process.env.SOLANA_PROXY_URL;
    if (!rpcUrl) {
      return res.status(500).json({ error: 'Missing SOLANA_PROXY_URL env var' });
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const version = await connection.getVersion();

    res.status(200).json({ status: 'ok', version });
  } catch (error: any) {
    console.error('[Solana Status Error]', error);
    res.status(500).json({ error: 'Failed to connect to Solana', details: error?.message || error });
  }
}
