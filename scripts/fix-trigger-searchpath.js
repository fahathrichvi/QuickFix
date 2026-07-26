const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function fixTriggerSearchPath() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    console.log('Updating handle_new_user_profile with explicit SET search_path = public...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
      RETURNS TRIGGER AS $$
      DECLARE
        v_role public.user_role := 'customer'::public.user_role;
        v_name TEXT;
        v_raw_role TEXT;
      BEGIN
        v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User');
        v_raw_role := NEW.raw_user_meta_data->>'role';

        IF v_raw_role = 'business_owner' THEN
          v_role := 'business_owner'::public.user_role;
        ELSIF v_raw_role = 'admin' THEN
          v_role := 'admin'::public.user_role;
        ELSE
          v_role := 'customer'::public.user_role;
        END IF;

        INSERT INTO public.profiles (id, full_name, avatar_url, role)
        VALUES (
          NEW.id,
          v_name,
          NEW.raw_user_meta_data->>'avatar_url',
          v_role
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role;

        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    `);

    console.log('✅ Trigger function successfully updated with SET search_path = public!');
  } catch (err) {
    console.error('Error updating trigger function:', err);
  } finally {
    await client.end();
  }
}

fixTriggerSearchPath();
