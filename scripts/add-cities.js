const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function runCitiesMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    console.log('Creating cities table and RLS policies...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.cities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL UNIQUE,
        state_or_country TEXT DEFAULT 'US',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public read active cities" ON public.cities;
      CREATE POLICY "Public read active cities" ON public.cities FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admins manage cities" ON public.cities;
      CREATE POLICY "Admins manage cities" ON public.cities FOR ALL USING (is_admin());

      INSERT INTO public.cities (name, state_or_country) VALUES
      ('Springfield', 'US'),
      ('Metropolis', 'US'),
      ('Gotham', 'US'),
      ('Star City', 'US'),
      ('Central City', 'US'),
      ('Coast City', 'US')
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ Cities table created and seeded successfully!');
  } catch (err) {
    console.error('Error running cities migration:', err);
  } finally {
    await client.end();
  }
}

runCitiesMigration();
