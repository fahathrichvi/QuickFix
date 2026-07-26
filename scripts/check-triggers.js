const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function checkTriggers() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL DB!');

    const res = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'users';
    `);

    console.log('Triggers on auth.users:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error checking triggers:', err);
  } finally {
    await client.end();
  }
}

checkTriggers();
