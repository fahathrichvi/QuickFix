const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function updateAdminPassword() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    // Enable pgcrypto if needed
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Ensure admin user exists in auth.users & profiles
    const adminEmail = 'admin@quickfix.com';
    const adminPassword = 'Password123!';
    const adminId = '10000000-0000-4000-8000-000000000001';

    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
      ) VALUES (
        '${adminId}',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        '${adminEmail}',
        crypt('${adminPassword}', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Quickfix SuperAdmin","role":"admin"}',
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = crypt('${adminPassword}', gen_salt('bf')),
        email_confirmed_at = NOW();
    `);

    await client.query(`
      INSERT INTO public.profiles (id, role, full_name, is_active)
      VALUES ('${adminId}', 'admin', 'Quickfix SuperAdmin', true)
      ON CONFLICT (id) DO UPDATE SET role = 'admin';
    `);

    console.log(`✅ Admin Account successfully set up!`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);

  } catch (err) {
    console.error('Error configuring admin account:', err);
  } finally {
    await client.end();
  }
}

updateAdminPassword();
