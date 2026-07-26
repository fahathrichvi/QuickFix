-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom Enums
CREATE TYPE user_role AS ENUM ('customer', 'business_owner', 'admin');
CREATE TYPE booking_status AS ENUM (
  'pending',
  'accepted',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rejected',
  'refunded',
  'rescheduled'
);
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_status AS ENUM ('free', 'active', 'past_due', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Businesses Table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  review_count INT NOT NULL DEFAULT 0,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  subscription_status subscription_status NOT NULL DEFAULT 'free',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Business Members Table
CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- 5. Services Table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Service Areas Table
CREATE TABLE public.service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Business Hours Table
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(business_id, day_of_week)
);

-- 8. Availability Slots Table
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Booking Status History Table
CREATE TABLE public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Review Replies Table
CREATE TABLE public.review_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  business_owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Favorites Table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- 14. Business Images Table
CREATE TABLE public.business_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Refunds Table
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  stripe_refund_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Subscription Plans Table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Subscriptions Table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Coupons Table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Advertisements Table
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  banner_url TEXT NOT NULL,
  target_city TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Saved Addresses Table
CREATE TABLE public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. Reports Table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL,
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. Verification Requests Table
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  notes TEXT,
  status verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. Processed Webhook Events Table
CREATE TABLE public.processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_category ON public.businesses(category_id);
CREATE INDEX idx_businesses_city ON public.businesses(city);
CREATE INDEX idx_businesses_ver_stat ON public.businesses(verification_status);
CREATE INDEX idx_businesses_featured ON public.businesses(is_featured);
CREATE INDEX idx_businesses_rating ON public.businesses(average_rating DESC);
CREATE INDEX idx_businesses_active ON public.businesses(is_active);
CREATE INDEX idx_businesses_location ON public.businesses USING GIST(location);

CREATE INDEX idx_services_business ON public.services(business_id);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_business ON public.bookings(business_id);
CREATE INDEX idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX idx_reviews_business ON public.reviews(business_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- Full-Text Search GIN Indexes
ALTER TABLE public.businesses ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, ''))
  ) STORED;
CREATE INDEX idx_businesses_fts ON public.businesses USING GIN(search_vector);

-- PostGIS Geography Trigger for businesses location sync
CREATE OR REPLACE FUNCTION sync_business_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_business_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON public.businesses
FOR EACH ROW EXECUTE FUNCTION sync_business_location();

-- Function: PostGIS Nearby Businesses Search
CREATE OR REPLACE FUNCTION nearby_businesses(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 50000,
  cat_id UUID DEFAULT NULL,
  min_rat NUMERIC DEFAULT 0,
  ver_stat TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  category_id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  average_rating NUMERIC(3, 2),
  review_count INT,
  verification_status verification_status,
  subscription_status subscription_status,
  is_featured BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.owner_id,
    b.category_id,
    b.name,
    b.slug,
    b.description,
    b.logo_url,
    b.cover_image_url,
    b.phone,
    b.whatsapp_number,
    b.email,
    b.website,
    b.address,
    b.city,
    b.country,
    b.latitude,
    b.longitude,
    b.average_rating,
    b.review_count,
    b.verification_status,
    b.subscription_status,
    b.is_featured,
    b.is_active,
    b.created_at,
    b.updated_at,
    ST_Distance(b.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_meters
  FROM public.businesses b
  WHERE b.is_active = true
    AND (cat_id IS NULL OR b.category_id = cat_id)
    AND b.average_rating >= min_rat
    AND (ver_stat IS NULL OR b.verification_status::text = ver_stat)
    AND ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_meters)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Atomic Booking Creation
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_customer_id UUID,
  p_service_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.bookings AS $$
DECLARE
  v_business_id UUID;
  v_price NUMERIC(10, 2);
  v_is_active BOOLEAN;
  v_overlap_count INT;
  v_new_booking public.bookings;
BEGIN
  -- 1. Validate service
  SELECT s.business_id, s.price, s.is_active
  INTO v_business_id, v_price, v_is_active
  FROM public.services s
  WHERE s.id = p_service_id;

  IF v_business_id IS NULL OR v_is_active = false THEN
    RAISE EXCEPTION 'Service not available or does not exist';
  END IF;

  -- 2. Validate overlapping bookings for business
  SELECT COUNT(*) INTO v_overlap_count
  FROM public.bookings b
  WHERE b.business_id = v_business_id
    AND b.booking_date = p_booking_date
    AND b.status NOT IN ('cancelled', 'rejected')
    AND (p_start_time, p_end_time) OVERLAPS (b.start_time, b.end_time);

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Time slot overlaps with an existing booking';
  END IF;

  -- 3. Insert booking
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
    p_customer_id,
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

  -- 4. Record booking status history
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
    p_customer_id,
    'Initial booking creation'
  );

  -- 5. Notifications
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_entity_type,
    related_entity_id
  )
  VALUES (
    p_customer_id,
    'booking_created',
    'Booking Placed',
    'Your booking request has been submitted.',
    'booking',
    v_new_booking.id
  );

  RETURN v_new_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function: Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Trigger Function: Recalculate Business Average Rating
CREATE OR REPLACE FUNCTION update_business_rating_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_biz_id UUID;
BEGIN
  v_biz_id := COALESCE(NEW.business_id, OLD.business_id);
  UPDATE public.businesses
  SET 
    average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE business_id = v_biz_id), 0.00),
    review_count = COALESCE((SELECT COUNT(*) FROM public.reviews WHERE business_id = v_biz_id), 0)
  WHERE id = v_biz_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_business_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_business_rating_trigger();


-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (is_admin());

-- Categories Policies
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (is_admin());

-- Businesses Policies
CREATE POLICY "Active businesses are viewable by public" ON public.businesses FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR is_admin());
CREATE POLICY "Business owners can insert business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update business" ON public.businesses FOR UPDATE USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "Admins can delete businesses" ON public.businesses FOR DELETE USING (is_admin());

-- Services Policies
CREATE POLICY "Services public view for active businesses" ON public.services FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = services.business_id AND b.is_active = true) OR is_admin()
);
CREATE POLICY "Owners manage business services" ON public.services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = services.business_id AND b.owner_id = auth.uid()) OR is_admin()
);

-- Bookings Policies
CREATE POLICY "Customers view own bookings" ON public.bookings FOR SELECT USING (
  customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.owner_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Customers create bookings" ON public.bookings FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Owners and Customers update permitted booking status" ON public.bookings FOR UPDATE USING (
  customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = bookings.business_id AND b.owner_id = auth.uid()) OR is_admin()
);

-- Reviews Policies
CREATE POLICY "Reviews public view" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers create reviews for completed bookings" ON public.reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = reviews.booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
  )
);
CREATE POLICY "Customers update own reviews" ON public.reviews FOR UPDATE USING (customer_id = auth.uid() OR is_admin());

-- Review Replies Policies
CREATE POLICY "Replies public view" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "Business owners insert replies" ON public.review_replies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reviews r
    JOIN public.businesses b ON b.id = r.business_id
    WHERE r.id = review_replies.review_id AND b.owner_id = auth.uid()
  )
);

-- Favorites & Notifications Policies
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users read & update own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Verification Requests Policies
CREATE POLICY "Business owners & Admins read verification requests" ON public.verification_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = verification_requests.business_id AND b.owner_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Business owners create verification requests" ON public.verification_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = verification_requests.business_id AND b.owner_id = auth.uid())
);
CREATE POLICY "Admins update verification requests" ON public.verification_requests FOR UPDATE USING (is_admin());

-- Storage Bucket Policies setup
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('business-assets', 'business-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-images', 'booking-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false) ON CONFLICT (id) DO NOTHING;
