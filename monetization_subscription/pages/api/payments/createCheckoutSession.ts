import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.body;
  if (req.method !== 'POST' || !userId) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  // Create or retrieve customer
  const customer = await stripe.customers.create({ metadata: { userId } });
  // Create subscription checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer: customer.id,
    success_url: `${process.env.NEXTAUTH_URL}/profile?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    metadata: { userId },
  });
  res.json({ sessionId: session.id });
}
