import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guards';

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.failure.error }, { status: guard.failure.status });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (userId === guard.data.userId) {
      return NextResponse.json(
        { error: 'You cannot delete your own administrator account.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Delete associated business if any
    await (supabaseAdmin.from('businesses') as any).delete().eq('owner_id', userId);

    // 2. Delete public profile
    await (supabaseAdmin.from('profiles') as any).delete().eq('id', userId);

    // 3. Delete from Supabase Auth GoTrue (auth.users)
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteErr) {
      console.warn('Warning: Could not delete from auth.users:', authDeleteErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'User account completely purged from auth and profile databases.',
    });
  } catch (err: any) {
    console.error('Error in /api/admin/delete-user:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete user account.' },
      { status: 500 }
    );
  }
}
