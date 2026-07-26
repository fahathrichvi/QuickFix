const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function checkIsAdmin() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    const res = await client.query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_name = 'is_admin';
    `);

    console.log('is_admin definition:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error checking is_admin:', err);
  } finally {
    await client.end();
  }
}

checkIsAdmin();
