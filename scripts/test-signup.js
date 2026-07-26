const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testSignUp() {
  // Credentials are arguments — this file is committed to a public repo.
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: node scripts/test-signup.js <email> <password>');
    process.exit(1);
  }

  console.log('Testing client signUp...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
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
