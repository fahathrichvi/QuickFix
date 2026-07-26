import { createClient } from '@/lib/supabase/server';

export interface GuardFailure {
  error: string;
  status: number;
}

export interface AdminGuardSuccess {
  userId: string;
}

/**
 * Verifies the caller is signed in AND has the `admin` role.
 *
 * Every route that uses the service-role client must call this first — the
 * service-role key bypasses RLS entirely, so the route itself is the only
 * thing standing between an anonymous request and full database access.
 */
export async function requireAdmin(): Promise<
  { ok: true; data: AdminGuardSuccess } | { ok: false; failure: GuardFailure }
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, failure: { error: 'Unauthorized', status: 401 } };
  }

  const { data: profile } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { ok: false, failure: { error: 'Forbidden: admin role required', status: 403 } };
  }

  return { ok: true, data: { userId: user.id } };
}
