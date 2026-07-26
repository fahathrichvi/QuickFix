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
  console.log('Testing admin createUser...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'vikki@quickfix.com',
    password: 'Password123!',
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
