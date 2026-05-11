-- ============================================================================
-- MIGRATION: Fix all missing columns in user_services
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add all missing columns to user_services
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS service_id uuid;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS accesos text;

-- Add type column to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'dominio';

-- Add foreign key for service_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_services_service_id_fkey'
  ) THEN
    ALTER TABLE public.user_services 
    ADD CONSTRAINT user_services_service_id_fkey 
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- FIX RLS POLICIES (avoid infinite recursion)
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Admin can do all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can do all on profiles" ON public.profiles FOR ALL USING (auth.uid() = id);

-- User_services policies
DROP POLICY IF EXISTS "Users can view their own user_services" ON public.user_services;
DROP POLICY IF EXISTS "Admin can do all on user_services" ON public.user_services;

CREATE POLICY "Users can view their own user_services" ON public.user_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can do all on user_services" ON public.user_services FOR ALL USING (auth.uid() = user_id);

-- Services policies
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
DROP POLICY IF EXISTS "Admin can do all on services" ON public.services;

CREATE POLICY "Everyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin can do all on services" ON public.services FOR ALL USING (auth.uid() = id);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin can do all on payments" ON public.payments;

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can do all on payments" ON public.payments FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFY YOUR ADMIN ROLE
-- ============================================================================
-- Your UID: 5b236d28-569f-4d6b-9ece-ecb9e34560f5

UPDATE profiles SET role = 'admin' WHERE id = '5b236d28-569f-4d6b-9ece-ecb9e34560f5';

-- Verify
SELECT id, email, name, role FROM profiles WHERE id = '5b236d28-569f-4d6b-9ece-ecb9e34560f5';

-- ============================================================================
-- VERIFY COLUMNS
-- ============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_services' 
ORDER BY ordinal_position;