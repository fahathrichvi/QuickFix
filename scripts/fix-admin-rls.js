const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function fixAdminRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    console.log('Updating RLS policies on profiles, businesses, and bookings for admin access...');
    await client.query(`
      -- 1. PROFILES RLS Policies
      DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;

      CREATE POLICY "Public read profiles" ON public.profiles
        FOR SELECT USING (true);

      CREATE POLICY "Users update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id OR is_admin());

      CREATE POLICY "Admins manage profiles" ON public.profiles
        FOR ALL USING (is_admin());

      -- 2. BUSINESSES RLS Policies
      DROP POLICY IF EXISTS "Public read active businesses" ON public.businesses;
      DROP POLICY IF EXISTS "Admins manage businesses" ON public.businesses;

      CREATE POLICY "Public read active businesses" ON public.businesses
        FOR SELECT USING (true);

      CREATE POLICY "Owners update own business" ON public.businesses
        FOR UPDATE USING (auth.uid() = owner_id OR is_admin());

      CREATE POLICY "Admins manage businesses" ON public.businesses
        FOR ALL USING (is_admin());

      -- 3. BOOKINGS RLS Policies
      DROP POLICY IF EXISTS "Users read own bookings" ON public.bookings;
      DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;

      CREATE POLICY "Users read own bookings" ON public.bookings
        FOR SELECT USING (
          auth.uid() = customer_id 
          OR auth.uid() IN (SELECT owner_id FROM public.businesses WHERE id = business_id)
          OR is_admin()
        );

      CREATE POLICY "Admins manage bookings" ON public.bookings
        FOR ALL USING (is_admin());
    `);

    console.log('✅ RLS policies updated successfully! Admin can now read all profiles & business partners!');

  } catch (err) {
    console.error('Error updating RLS policies:', err);
  } finally {
    await client.end();
  }
}

fixAdminRLS();
