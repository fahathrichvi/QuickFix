const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupAdminAccount() {
  const adminEmail = 'admin@quickfix.com';
  const adminPassword = 'Password123!';

  console.log(`Setting up admin user: ${adminEmail}`);

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = usersData?.users?.find(u => u.email === adminEmail);

  let userId;

  if (existingUser) {
    console.log('Admin user found, updating password...');
    const { data: updatedUser, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: adminPassword, email_confirm: true }
    );
    if (updateErr) console.error('Error updating admin:', updateErr);
    userId = existingUser.id;
  } else {
    console.log('Creating new admin user...');
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'System Admin', role: 'admin' }
    });
    if (createErr) console.error('Error creating admin:', createErr);
    userId = newUser?.user?.id;
  }

  if (userId) {
    console.log('Updating profiles table role to admin...');
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: 'System Admin',
      role: 'admin',
      is_active: true
    });
    if (profileErr) console.error('Error upserting profile:', profileErr);
    else console.log('Admin user successfully configured!');
  }
}

setupAdminAccount();
