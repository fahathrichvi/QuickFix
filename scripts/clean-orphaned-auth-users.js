const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function cleanOrphanedAuthUsers() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    // Find auth users that do not exist in public.profiles
    const res = await client.query(`
      SELECT u.id, u.email 
      FROM auth.users u 
      LEFT JOIN public.profiles p ON u.id = p.id 
      WHERE p.id IS NULL;
    `);

    console.log('Orphaned Auth Users (in auth.users but not in profiles):', res.rows);

    if (res.rows.length > 0) {
      console.log('Cleaning up orphaned auth users so they can re-register...');
      for (const row of res.rows) {
        await client.query(`DELETE FROM auth.users WHERE id = $1`, [row.id]);
        console.log(`Deleted orphaned auth user: ${row.email} (${row.id})`);
      }
    } else {
      console.log('No orphaned auth users found.');
    }

  } catch (err) {
    console.error('Error cleaning orphaned auth users:', err);
  } finally {
    await client.end();
  }
}

cleanOrphanedAuthUsers();
