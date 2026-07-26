const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function addEmailToProfiles() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    console.log('Adding email column to public.profiles and updating trigger function...');
    await client.query(`
      -- 1. Add email column to profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

      -- 2. Populate email for existing users from auth.users
      UPDATE public.profiles p
      SET email = u.email
      FROM auth.users u
      WHERE p.id = u.id AND (p.email IS NULL OR p.email != u.email);

      -- 3. Update trigger function handle_new_user_profile to save email
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

        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
          NEW.id,
          NEW.email,
          v_name,
          NEW.raw_user_meta_data->>'avatar_url',
          v_role
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role;

        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    `);

    console.log('✅ email column added to profiles and synced from auth.users!');
  } catch (err) {
    console.error('Error adding email to profiles:', err);
  } finally {
    await client.end();
  }
}

addEmailToProfiles();
