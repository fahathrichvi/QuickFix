import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-guards';

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.failure.error }, { status: guard.failure.status });
    }

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'User ID and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Reset password using Supabase Auth Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Record in audit log
    await (supabaseAdmin.from('audit_logs') as any).insert({
      actor_id: guard.data.userId,
      action: 'admin_reset_user_password',
      target_entity: 'profiles',
      target_id: userId,
      details: { reset_by_admin: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully!',
      user: data.user,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reset-password:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during password reset.' },
      { status: 500 }
    );
  }
}
