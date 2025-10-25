import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const experiments = await prisma.experiment.findMany({ include: { variants: true } });
  res.json(experiments);
}
