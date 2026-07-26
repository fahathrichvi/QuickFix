const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function runSeed() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database!');

    const seedSqlPath = path.join(__dirname, '../supabase/seed.sql');
    console.log(`Reading SQL seed data from ${seedSqlPath}`);
    const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');

    console.log('Applying seed data...');
    await client.query(seedSql);
    console.log('Seed data applied successfully!');

  } catch (err) {
    console.error('Error applying seed:', err);
  } finally {
    await client.end();
  }
}

runSeed();
