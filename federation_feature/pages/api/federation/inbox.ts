import { NextApiRequest, NextApiResponse } from 'next';
import { handleIncomingActivity } from '@/lib/federation/activitypub';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const activity = req.body;
  await handleIncomingActivity(activity);
  res.status(200).json({ received: true });
}
