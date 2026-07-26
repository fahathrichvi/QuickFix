const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function checkAuthSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    // Check all triggers in auth schema
    const res = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth';
    `);

    console.log('Auth Schema Triggers:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error checking auth schema:', err);
  } finally {
    await client.end();
  }
}

checkAuthSchema();
