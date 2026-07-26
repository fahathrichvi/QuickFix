const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

/**
 * Promotes (or creates) a single account and gives it the admin role.
 *
 *   node scripts/set-admin-account.js <email> <password> ["Full Name"]
 *
 * Credentials are passed in rather than hardcoded, so this file never carries a
 * live password. Self-service signup deliberately cannot mint admins — this is
 * the supported way to provision one.
 */
async function setAdminAccount() {
  const [email, password, fullNameArg] = process.argv.slice(2);
  const fullName = fullNameArg || 'Quickfix Administrator';

  if (!email || !password) {
    console.error('Usage: node scripts/set-admin-account.js <email> <password> ["Full Name"]');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // listUsers is paginated; page through rather than assuming page 1 holds everyone.
  let existingUser = null;
  for (let page = 1; page <= 20 && !existingUser; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Failed to list users:', error.message);
      process.exit(1);
    }
    existingUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
    if (data.users.length < 200) break;
  }

  let userId;

  if (existingUser) {
    console.log('Existing account found — updating password and role metadata...');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existingUser.user_metadata, full_name: fullName, role: 'admin' },
    });
    if (error) {
      console.error('Failed to update account:', error.message);
      process.exit(1);
    }
    userId = existingUser.id;
  } else {
    console.log('No existing account — creating one...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'admin' },
    });
    if (error) {
      console.error('Failed to create account:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email, full_name: fullName, role: 'admin', is_active: true });

  if (profileError) {
    console.error('Failed to set profile role:', profileError.message);
    process.exit(1);
  }

  // Read back, so a silently-failed write cannot be reported as success.
  const { data: verify, error: verifyError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, is_active')
    .eq('id', userId)
    .single();

  if (verifyError || verify?.role !== 'admin') {
    console.error('Verification failed — role is not admin:', verifyError?.message || verify);
    process.exit(1);
  }

  console.log('✅ Admin account ready:', JSON.stringify(verify));
}

setAdminAccount();
