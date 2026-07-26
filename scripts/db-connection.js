const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DB_PASS = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const POOLER_HOST =
  process.env.SUPABASE_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';

if (!DB_PASS || !PROJECT_REF) {
  console.error(
    'Missing database credentials. Set SUPABASE_DB_PASSWORD and SUPABASE_PROJECT_REF\n' +
      'in .env.local (see .env.example) before running this script.'
  );
  process.exit(1);
}

const connectionString = `postgres://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASS)}@${POOLER_HOST}:6543/postgres`;

module.exports = { connectionString };
