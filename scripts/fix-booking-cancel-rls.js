const { Client } = require('pg');

const { connectionString } = require('./db-connection');

async function fixBookingCancelRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB!');

    console.log('Updating RLS policies for bookings, notifications, and audit_logs...');
    await client.query(`
      -- Bookings UPDATE policy
      DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
      DROP POLICY IF EXISTS "Users update bookings" ON public.bookings;

      CREATE POLICY "Users update bookings" ON public.bookings
        FOR UPDATE USING (true) WITH CHECK (true);

      -- Notifications INSERT policy
      DROP POLICY IF EXISTS "Users manage notifications" ON public.notifications;
      DROP POLICY IF EXISTS "Public insert notifications" ON public.notifications;

      CREATE POLICY "Public insert notifications" ON public.notifications
        FOR INSERT WITH CHECK (true);

      CREATE POLICY "Users read notifications" ON public.notifications
        FOR SELECT USING (true);

      -- Audit Logs INSERT policy
      DROP POLICY IF EXISTS "Public insert audit_logs" ON public.audit_logs;

      CREATE POLICY "Public insert audit_logs" ON public.audit_logs
        FOR INSERT WITH CHECK (true);

      CREATE POLICY "Public read audit_logs" ON public.audit_logs
        FOR SELECT USING (true);
    `);

    console.log('✅ RLS policies for bookings cancellation & notifications successfully updated!');

  } catch (err) {
    console.error('Error updating RLS policies:', err);
  } finally {
    await client.end();
  }
}

fixBookingCancelRLS();
