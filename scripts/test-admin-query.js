const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testAdminQuery() {
  console.log('Testing business select with join...');
  const { data: bData, error } = await supabase
    .from('businesses')
    .select(`
      *,
      profiles!owner_id (id, full_name, role),
      categories (id, name)
    `);

  console.log('Error:', error);
  console.log('Result length:', bData ? bData.length : 0);
  console.log('Result:', JSON.stringify(bData, null, 2));
}

testAdminQuery();
