const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function testDirectInsert() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    // Credentials are arguments and bound as query parameters — this file is
    // committed to a public repo.
    const [email, password] = process.argv.slice(2);

    if (!email || !password) {
      console.error('Usage: node scripts/test-db-insert.js <email> <password>');
      process.exit(1);
    }

    const testId = '40000000-0000-4000-8000-000000000099';
    await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
       ) VALUES (
         $1::uuid,
         '00000000-0000-0000-0000-000000000000',
         'authenticated',
         'authenticated',
         $2,
         crypt($3, gen_salt('bf')),
         NOW(),
         '{"provider":"email","providers":["email"]}',
         '{"full_name":"Direct Test","role":"customer"}',
         false,
         NOW(),
         NOW()
       );`,
      [testId, email, password]
    );

    console.log('Direct insert into auth.users succeeded!');
  } catch (err) {
    console.error('Error on direct insert:', err);
  } finally {
    await client.end();
  }
}

testDirectInsert();
