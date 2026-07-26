const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testSignUp() {
  console.log('Testing client signUp...');
  const { data, error } = await supabase.auth.signUp({
    email: 'vikki@quickfix.com',
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Vikki',
        role: 'customer'
      }
    }
  });

  console.log('Result Data:', JSON.stringify(data, null, 2));
  console.log('Result Error:', error);
}

testSignUp();
