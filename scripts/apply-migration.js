const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const { connectionString } = require('./db-connection');

/**
 * Applies a single SQL migration file inside one transaction.
 *
 *   node scripts/apply-migration.js supabase/migrations/<file>.sql
 *
 * Unlike the older helpers in this folder, a failure rolls back and exits
 * non-zero instead of being logged and ignored.
 */
async function applyMigration() {
  const relPath = process.argv[2];

  if (!relPath) {
    console.error('Usage: node scripts/apply-migration.js <path-to-sql-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), relPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf-8');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log(`Applying ${relPath} ...`);

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration applied and committed.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
      console.error('Rolled back — no changes were made.');
    } catch {
      // connection may already be unusable
    }
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

applyMigration();
