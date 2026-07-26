-- Seed Categories (No FK dependency)
INSERT INTO public.categories (id, name, slug, icon, description) VALUES
('c0000000-0000-4000-8000-000000000001', 'Plumbing & Drainage', 'plumbing-drainage', 'Wrench', 'Fast fixes for leaks, pipe repairs, drain cleaning and installations.'),
('c0000000-0000-4000-8000-000000000002', 'Electrical & Wiring', 'electrical-wiring', 'Zap', 'Certified electricians for lighting, wiring, panel upgrades, and repairs.'),
('c0000000-0000-4000-8000-000000000003', 'HVAC & Air Conditioning', 'hvac-air-conditioning', 'Wind', 'AC repair, heating system maintenance, duct cleaning, and climate control.'),
('c0000000-0000-4000-8000-000000000004', 'Cleaning & Housekeeping', 'cleaning-housekeeping', 'Sparkles', 'Deep house cleaning, office maid services, and move-in sanitization.'),
('c0000000-0000-4000-8000-000000000005', 'Carpentry & Handyman', 'carpentry-handyman', 'Hammer', 'Custom woodwork, furniture assembly, door repairs, and general home fixes.'),
('c0000000-0000-4000-8000-000000000006', 'Appliance Repair', 'appliance-repair', 'Tv', 'Refrigerators, washing machines, ovens, and home appliance maintenance.')
ON CONFLICT (id) DO NOTHING;

-- Seed Auth Users so auth.users FK constraint passes
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, confirmation_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES
('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@quickfix.example', '$2a$10$abcdefghijklmnopqrstuu', NOW(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Morgan (Admin)","role":"admin"}', false, NOW(), NOW()),
('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'plumber@quickfix.example', '$2a$10$abcdefghijklmnopqrstuu', NOW(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Robert Master Plumber","role":"business_owner"}', false, NOW(), NOW()),
('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'electric@quickfix.example', '$2a$10$abcdefghijklmnopqrstuu', NOW(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Elena HighVoltage Electric","role":"business_owner"}', false, NOW(), NOW()),
('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@quickfix.example', '$2a$10$abcdefghijklmnopqrstuu', NOW(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Johnson","role":"customer"}', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Profiles
INSERT INTO public.profiles (id, role, full_name, avatar_url, phone, preferred_language) VALUES
('10000000-0000-4000-8000-000000000001', 'admin', 'Alex Morgan (Admin)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', '+15550000001', 'en'),
('10000000-0000-4000-8000-000000000002', 'business_owner', 'Robert Master Plumber', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', '+15550000002', 'en'),
('10000000-0000-4000-8000-000000000003', 'business_owner', 'Elena HighVoltage Electric', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80', '+15550000003', 'en'),
('10000000-0000-4000-8000-000000000004', 'customer', 'Sarah Johnson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', '+15550000004', 'en')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Seed Businesses
INSERT INTO public.businesses (
  id, owner_id, category_id, name, slug, description, logo_url, cover_image_url, phone, whatsapp_number, email, website, address, city, country, latitude, longitude, average_rating, review_count, verification_status, subscription_status, is_featured, is_active
) VALUES
(
  'b0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000001',
  'Metro Plumbing & Rapid Drain Experts',
  'metro-plumbing-rapid-drain',
  'Top-rated 24/7 emergency plumbing services, leak detection, sewer line replacement, and water heater installation.',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  '+15551234567',
  '+15551234567',
  'contact@metroplumbing.com',
  'https://metroplumbing.example.com',
  '742 Evergreen Terrace',
  'Springfield',
  'US',
  37.7749,
  -122.4194,
  4.92,
  28,
  'approved',
  'active',
  true,
  true
),
(
  'b0000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  'c0000000-0000-4000-8000-000000000002',
  'VoltShield Certified Electrical Solutions',
  'voltshield-certified-electrical',
  'Licensed residential and commercial electricians. Panel upgrades, EV charger installation, smart home automation, and emergency wiring fixes.',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
  '+15559876543',
  '+15559876543',
  'info@voltshield.com',
  'https://voltshield.example.com',
  '101 Innovation Boulevard',
  'Springfield',
  'US',
  37.7833,
  -122.4167,
  4.85,
  19,
  'approved',
  'active',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Seed Services
INSERT INTO public.services (id, business_id, category_id, name, description, price, duration_minutes, is_active) VALUES
('50000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Emergency Pipe Leak Repair', 'Rapid diagnostic and pipe sealant repair for active residential leaks.', 120.00, 60, true),
('50000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Water Heater Full Inspection & Tuneup', 'Complete heating element check, flushing tank, pressure valve test.', 180.00, 90, true),
('50000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'EV Charger Level 2 Installation', 'Dedicated 240V circuit setup and mounting for residential EV chargers.', 450.00, 180, true),
('50000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Main Breaker Panel Safety Inspection', 'Thermal imaging check, breaker torque test, and safety certification.', 150.00, 60, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Business Hours
INSERT INTO public.business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES
('b0000000-0000-4000-8000-000000000001', 1, '08:00', '18:00', false),
('b0000000-0000-4000-8000-000000000001', 2, '08:00', '18:00', false),
('b0000000-0000-4000-8000-000000000001', 3, '08:00', '18:00', false),
('b0000000-0000-4000-8000-000000000001', 4, '08:00', '18:00', false),
('b0000000-0000-4000-8000-000000000001', 5, '08:00', '18:00', false),
('b0000000-0000-4000-8000-000000000001', 6, '09:00', '15:00', false),
('b0000000-0000-4000-8000-000000000001', 0, '00:00', '00:00', true)
ON CONFLICT DO NOTHING;

-- Seed Initial Completed Booking for Review Testing
INSERT INTO public.bookings (
  id, customer_id, business_id, service_id, booking_date, start_time, end_time, total_price, status, notes
) VALUES (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  CURRENT_DATE - INTERVAL '2 days',
  '10:00:00',
  '11:00:00',
  120.00,
  'completed',
  'Burst pipe under kitchen sink fixed promptly.'
) ON CONFLICT (id) DO NOTHING;

-- Seed Initial Review
INSERT INTO public.reviews (
  id, booking_id, customer_id, business_id, rating, comment
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  5,
  'Outstanding emergency service! Robert arrived within 30 minutes and fixed our leaking kitchen pipe cleanly.'
) ON CONFLICT (id) DO NOTHING;
