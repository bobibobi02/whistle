import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fromId, toId, amount } = req.body;
  if (req.method !== 'POST' || !fromId || !toId || !amount) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  // Create Stripe PaymentIntent or Transfer
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: { fromId, toId },
  });
  // Record tip in DB
  await prisma.tip.create({ data: { fromId, toId, amount } });
  res.json({ clientSecret: paymentIntent.client_secret });
}
