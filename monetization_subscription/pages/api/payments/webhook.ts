import { buffer } from 'micro';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

export default async function handler(req, res) {
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId as string;
    // Save subscription record
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomer: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: 'active'
      },
      create: {
        userId,
        stripeCustomer: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: 'active'
      }
    });
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId as string;
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled' }
    });
  }
  res.json({ received: true });
}
