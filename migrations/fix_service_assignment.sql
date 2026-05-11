-- ============================================================================
-- MIGRATION: Fix service assignment issues
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add missing columns to user_services
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired', 'warning'));

-- 2. Add type column to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'dominio' CHECK (type IN ('dominio', 'hosting', 'correo', 'membresia', 'personalizado'));

-- 3. Verify/Recreate RLS policies for user_services
DROP POLICY IF EXISTS "Users can view their own user_services" ON public.user_services;
DROP POLICY IF EXISTS "Admin can do all on user_services" ON public.user_services;

CREATE POLICY "Users can view their own user_services" 
  ON public.user_services 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can do all on user_services" 
  ON public.user_services 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 4. Verify/Recreate RLS policies for services
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
DROP POLICY IF EXISTS "Admin can do all on services" ON public.services;

CREATE POLICY "Everyone can view services" 
  ON public.services 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admin can do all on services" 
  ON public.services 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 5. Verify/Recreate RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can do all on profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admin can do all on profiles" 
  ON public.profiles 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 6. Ensure your admin user has role='admin'
-- Replace 'YOUR_ADMIN_EMAIL' with your actual email
-- UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_ADMIN_EMAIL';

-- 7. Verification queries (run these to check)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'user_services' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'services' ORDER BY ordinal_position;
-- SELECT * FROM profiles LIMIT 5;