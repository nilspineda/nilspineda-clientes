-- ============================================================================
-- FIX: Add missing columns to user_services and fix RLS
-- ============================================================================

-- 1. Agregar columnas faltantes a user_services
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS url_dominio text;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id);

-- 2. Agregar columna type a services si no existe
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'dominio';

-- 3. Corregir RLS policies para profiles (evitar recursión infinita)
DROP POLICY IF EXISTS "Admin can do all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can do all on profiles" 
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- 4. Corregir RLS policies para user_services
DROP POLICY IF EXISTS "Users can view their own user_services" ON public.user_services;
DROP POLICY IF EXISTS "Admin can do all on user_services" ON public.user_services;

CREATE POLICY "Users can view their own user_services" 
  ON public.user_services FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can do all on user_services" 
  ON public.user_services FOR ALL USING (auth.uid() = user_id);

-- 5. Corregir RLS policies para services
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
DROP POLICY IF EXISTS "Admin can do all on services" ON public.services;

CREATE POLICY "Everyone can view services" 
  ON public.services FOR SELECT USING (true);

CREATE POLICY "Admin can do all on services" 
  ON public.services FOR ALL USING (auth.uid() = user_id);

-- 6. Verificar que todo está bien
SELECT 'user_services columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_services' ORDER BY ordinal_position;

SELECT 'services columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'services' ORDER BY ordinal_position;

SELECT 'Tu perfil:' as info;
SELECT id, email, name, role FROM profiles WHERE email = 'nilspineda@gmail.com';