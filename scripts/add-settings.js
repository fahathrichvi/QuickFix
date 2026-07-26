const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function createPlatformSettings() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    console.log('Creating platform_settings table and RLS policies...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.platform_settings (
        id INT PRIMARY KEY DEFAULT 1,
        currency_code TEXT NOT NULL DEFAULT 'LKR',
        currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
        commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'flat'
        commission_value NUMERIC NOT NULL DEFAULT 10,       -- 10% or Rs. 10
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      );

      ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public read platform settings" ON public.platform_settings;
      CREATE POLICY "Public read platform settings" ON public.platform_settings FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
      CREATE POLICY "Admins manage platform settings" ON public.platform_settings FOR ALL USING (is_admin());

      INSERT INTO public.platform_settings (id, currency_code, currency_symbol, commission_type, commission_value)
      VALUES (1, 'LKR', 'Rs.', 'percentage', 10)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ platform_settings table created and initial defaults set!');
  } catch (err) {
    console.error('Error creating platform_settings table:', err);
  } finally {
    await client.end();
  }
}

createPlatformSettings();
