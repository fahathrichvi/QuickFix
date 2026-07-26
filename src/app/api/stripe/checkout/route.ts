import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24' as any,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking parameters' }, { status: 400 });
    }

    // The amount and the service name must come from the database, never from the
    // request body — otherwise the client can name its own price. Selecting via the
    // user's own (RLS-scoped) client also proves the booking belongs to them.
    const { data: booking } = await (supabase.from('bookings') as any)
      .select('id, customer_id, total_price, status, services (name)')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return NextResponse.json(
        { error: 'This booking is no longer payable.' },
        { status: 400 }
      );
    }

    const price = Number(booking.total_price);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Booking has an invalid price.' }, { status: 400 });
    }

    const serviceRel = Array.isArray(booking.services) ? booking.services[0] : booking.services;
    const serviceName = serviceRel?.name || 'Quickfix Appointment Service';

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard/customer?payment=success&bookingId=${bookingId}`,
      cancel_url: `${origin}/dashboard/customer?payment=cancelled`,
      metadata: {
        bookingId: bookingId,
        customerId: user.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
