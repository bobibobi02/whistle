import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeToxicity } from '../../../../lib/perspective'; // ✅ Corrected relative path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content } = req.body;
  if (typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Invalid content' });
  }

  try {
    const score = await analyzeToxicity(content);
    const flagged = score >= 0.8;
    return res.status(200).json({ flagged, score });
  } catch (err) {
    console.error('Toxicity check failed:', err);
    return res.status(500).json({ error: 'Failed to analyze content' });
  }
}
