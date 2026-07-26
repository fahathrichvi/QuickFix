const { Client } = require('pg');

const { connectionString } = require('./db-connection');

/**
 * Low-level fallback that writes an admin straight into auth.users via SQL.
 *
 *   node scripts/set-admin-db.js <email> <password> [uuid]
 *
 * Prefer scripts/set-admin-account.js, which goes through the Supabase Auth
 * Admin API and stays consistent with what GoTrue expects. Use this only if the
 * Admin API is unavailable.
 *
 * Credentials are arguments, never literals — this file is committed to a public
 * repo. Values are bound as query parameters instead of interpolated into SQL.
 */
async function updateAdminPassword() {
  const [adminEmail, adminPassword, adminIdArg] = process.argv.slice(2);

  if (!adminEmail || !adminPassword) {
    console.error('Usage: node scripts/set-admin-db.js <email> <password> [uuid]');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    // Enable pgcrypto if needed
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    const { rows } = await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
       ) VALUES (
         COALESCE($3::uuid, gen_random_uuid()),
         '00000000-0000-0000-0000-000000000000',
         'authenticated',
         'authenticated',
         $1,
         crypt($2, gen_salt('bf')),
         NOW(),
         '{"provider":"email","providers":["email"]}',
         jsonb_build_object('full_name', 'Quickfix SuperAdmin', 'role', 'admin'),
         false,
         NOW(),
         NOW()
       )
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         encrypted_password = crypt($2, gen_salt('bf')),
         email_confirmed_at = NOW()
       RETURNING id;`,
      [adminEmail, adminPassword, adminIdArg || null]
    );

    const userId = rows[0].id;

    await client.query(
      `INSERT INTO public.profiles (id, role, full_name, email, is_active)
       VALUES ($1, 'admin', 'Quickfix SuperAdmin', $2, true)
       ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email;`,
      [userId, adminEmail]
    );

    console.log(`✅ Admin account configured for ${adminEmail} (${userId})`);
  } catch (err) {
    console.error('Error configuring admin account:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

updateAdminPassword();
