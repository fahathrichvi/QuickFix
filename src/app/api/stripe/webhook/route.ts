import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24' as any,
});

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured; refusing to process webhook.');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  try {
    // Never fall back to parsing the unverified body: the signature is the only
    // thing proving this request actually came from Stripe. Without it anyone
    // could POST a fake checkout.session.completed and confirm bookings for free.
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Signature Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // 1. Idempotency claim: rely on the UNIQUE(event_id) constraint rather than a
  // read-then-write check, which two concurrent redeliveries can both pass.
  const { error: claimError } = await (supabaseAdmin.from('processed_webhook_events') as any)
    .insert({
      event_id: event.id,
      event_type: event.type,
    });

  if (claimError) {
    // 23505 = unique_violation -> this event was already claimed and processed.
    if (claimError.code === '23505') {
      return NextResponse.json({ message: 'Event already processed' }, { status: 200 });
    }
    console.error('Failed to record webhook event:', claimError);
    return NextResponse.json({ error: 'Failed to record webhook event' }, { status: 500 });
  }

  // 2. Handle Stripe Webhook Events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      // Record payment
      await (supabaseAdmin.from('payments') as any).insert({
        booking_id: bookingId,
        stripe_payment_intent_id: (session.payment_intent as string) || session.id,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency || 'usd',
        status: 'succeeded',
      });

      // Update booking status to confirmed
      await (supabaseAdmin.from('bookings') as any)
        .update({ status: 'confirmed' })
        .eq('id', bookingId);
    }
  }

  return NextResponse.json({ received: true });
}
