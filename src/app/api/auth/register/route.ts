import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password, fullName, phone, role, businessName, categoryId, city } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    // Self-service signup may only ever create these roles. Anything else
    // (notably 'admin') is silently downgraded — the role arrives from the
    // browser, so it is attacker-controlled input.
    const SELF_SERVICE_ROLES = ['customer', 'business_owner'] as const;
    const safeRole = SELF_SERVICE_ROLES.includes(role) ? role : 'customer';

    const supabaseAdmin = createAdminClient();

    // 1. Create user via Supabase Auth Admin API (bypasses email rate limits and auto-confirms)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role: safeRole,
        city: city || 'Springfield',
      },
    });

    if (createError) {
      // If user already exists, return clear message
      if (createError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please log in.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = userData.user.id;

    // 2. Ensure profile exists with correct role, phone, and email
    await (supabaseAdmin.from('profiles') as any).upsert({
      id: userId,
      full_name: fullName,
      email: email,
      phone: phone || null,
      role: safeRole,
      is_active: true,
    });

    // 3. If business owner, create business row
    if (safeRole === 'business_owner' && businessName) {
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await (supabaseAdmin.from('businesses') as any).insert({
        owner_id: userId,
        category_id: categoryId || null,
        name: businessName,
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
        phone: phone || null,
        email: email,
        address: 'Main Street',
        city: city || 'Springfield',
        latitude: 37.7749,
        longitude: -122.4194,
        verification_status: 'pending',
        subscription_status: 'free',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      user: userData.user,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/register:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
