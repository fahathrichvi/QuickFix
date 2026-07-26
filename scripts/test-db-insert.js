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

    const testId = '40000000-0000-4000-8000-000000000099';
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
      ) VALUES (
        '${testId}',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'directtest@quickfix.com',
        crypt('Password123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Direct Test","role":"customer"}',
        false,
        NOW(),
        NOW()
      );
    `);

    console.log('Direct insert into auth.users succeeded!');
  } catch (err) {
    console.error('Error on direct insert:', err);
  } finally {
    await client.end();
  }
}

testDirectInsert();
