import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { instanceDomain, activity } = req.body;
  // Fetch instance public key, endpoint...
  // TODO: sign and deliver activity via HTTP POST to instanceDomain/inbox
  res.status(200).json({ sent: true });
}
