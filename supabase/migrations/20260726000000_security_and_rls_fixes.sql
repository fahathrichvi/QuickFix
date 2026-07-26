-- Security and RLS corrections for the initial Quickfix schema.
--
-- Fixes, in order:
--   1. create_booking_atomic accepted the customer id as a parameter while running
--      as SECURITY DEFINER, letting any signed-in user create bookings in someone
--      else's name. It now derives the customer from auth.uid().
--   2. booking_status_history had RLS enabled but no policies at all, so every
--      status-history insert from the dashboards was silently rejected.
--   3. The notifications policy was FOR ALL USING (user_id = auth.uid()). With no
--      WITH CHECK clause Postgres reuses USING for inserts, so a business owner or
--      admin could never notify a customer — those inserts always failed.
--   4. SECURITY DEFINER functions had no pinned search_path.

-- 1. Atomic booking creation, with the customer taken from the session.
DROP FUNCTION IF EXISTS public.create_booking_atomic(UUID, UUID, DATE, TIME, TIME, TEXT);

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_service_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_customer_id UUID := auth.uid();
  v_business_id UUID;
  v_price NUMERIC(10, 2);
  v_is_active BOOLEAN;
  v_overlap_count INT;
  v_new_booking public.bookings;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a booking';
  END IF;

  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Booking end time must be after the start time';
  END IF;

  -- 1. Validate service
  SELECT s.business_id, s.price, s.is_active
  INTO v_business_id, v_price, v_is_active
  FROM public.services s
  WHERE s.id = p_service_id;

  IF v_business_id IS NULL OR v_is_active = false THEN
    RAISE EXCEPTION 'Service not available or does not exist';
  END IF;

  -- 2. Serialise concurrent bookings for the same business+date, so that the
  --    overlap check below cannot be raced by a simultaneous transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_business_id::text || p_booking_date::text, 0));

  -- 3. Validate overlapping bookings for business
  SELECT COUNT(*) INTO v_overlap_count
  FROM public.bookings b
  WHERE b.business_id = v_business_id
    AND b.booking_date = p_booking_date
    AND b.status NOT IN ('cancelled', 'rejected')
    AND (p_start_time, p_end_time) OVERLAPS (b.start_time, b.end_time);

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Time slot overlaps with an existing booking';
  END IF;

  -- 4. Insert booking
  INSERT INTO public.bookings (
    customer_id,
    business_id,
    service_id,
    booking_date,
    start_time,
    end_time,
    total_price,
    status,
    notes
  )
  VALUES (
    v_customer_id,
    v_business_id,
    p_service_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    v_price,
    'pending',
    p_notes
  )
  RETURNING * INTO v_new_booking;

  -- 5. Record booking status history
  INSERT INTO public.booking_status_history (
    booking_id,
    old_status,
    new_status,
    changed_by,
    notes
  )
  VALUES (
    v_new_booking.id,
    NULL,
    'pending',
    v_customer_id,
    'Initial booking creation'
  );

  -- 6. Notifications
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id
  )
  VALUES (
    v_customer_id,
    'booking_created',
    'Booking Placed',
    'Your booking request has been submitted.',
    'booking',
    v_new_booking.id
  );

  RETURN v_new_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. booking_status_history policies (previously RLS-enabled with zero policies).
DROP POLICY IF EXISTS "Booking parties read status history" ON public.booking_status_history;
CREATE POLICY "Booking parties read status history" ON public.booking_status_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_status_history.booking_id
      AND (
        b.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.businesses biz
          WHERE biz.id = b.business_id AND biz.owner_id = auth.uid()
        )
      )
  ) OR is_admin()
);

DROP POLICY IF EXISTS "Booking parties write status history" ON public.booking_status_history;
CREATE POLICY "Booking parties write status history" ON public.booking_status_history
FOR INSERT WITH CHECK (
  changed_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_status_history.booking_id
        AND (
          b.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.businesses biz
            WHERE biz.id = b.business_id AND biz.owner_id = auth.uid()
          )
        )
    ) OR is_admin()
  )
);

-- 3. Notifications: split read/update from insert so that a business owner (or an
--    admin) can notify the other party to a booking.
DROP POLICY IF EXISTS "Users read & update own notifications" ON public.notifications;

CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Booking counterparties send notifications" ON public.notifications
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR is_admin()
  -- A business owner may notify a customer who has booked with them.
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.businesses biz ON biz.id = b.business_id
    WHERE b.customer_id = notifications.user_id
      AND biz.owner_id = auth.uid()
  )
  -- A customer may notify the owner of a business they have booked with.
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.businesses biz ON biz.id = b.business_id
    WHERE biz.owner_id = notifications.user_id
      AND b.customer_id = auth.uid()
  )
);

-- 4. audit_logs was RLS-enabled with no policies, so the admin dashboard's own
--    audit writes and reads were silently dropped.
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins write audit logs" ON public.audit_logs;
CREATE POLICY "Admins write audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (is_admin() AND actor_id = auth.uid());

-- 5. Pin search_path on the remaining SECURITY DEFINER helpers.
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_business_rating_trigger() SET search_path = public;
ALTER FUNCTION public.nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, NUMERIC, TEXT) SET search_path = public;
