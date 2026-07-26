const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function checkBusinesses() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    const res = await client.query(`
      SELECT b.id, b.name, b.owner_id, b.category_id, b.city, p.full_name, p.role
      FROM public.businesses b
      LEFT JOIN public.profiles p ON b.owner_id = p.id;
    `);

    console.log('Businesses in DB:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error checking businesses:', err);
  } finally {
    await client.end();
  }
}

checkBusinesses();
