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

async function testAdminCreate() {
  // Credentials are arguments — this file is committed to a public repo.
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: node scripts/test-admin-create.js <email> <password>');
    process.exit(1);
  }

  console.log('Testing admin createUser...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Vikki',
      role: 'customer'
    }
  });

  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

testAdminCreate();
