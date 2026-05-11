-- MIGRATION: Add type column to services table if not exists
-- Run this in Supabase SQL Editor

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'dominio' 
  CHECK (type IN ('dominio', 'hosting', 'correo', 'membresia', 'personalizado'));

-- Add RLS policy for services if not exists
drop policy if exists "Admin can do all on services" on public.services;
create policy "Admin can do all on services" on public.services for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Add missing columns to user_services if not exists
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS notes text;