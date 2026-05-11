-- Add missing columns to user_services table
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS owner integer DEFAULT 0;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS service_id uuid;
ALTER TABLE public.user_services ADD COLUMN IF NOT EXISTS accesos text;

-- Add type to services if not exists
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS type text DEFAULT 'dominio';

-- Add foreign key for service_id
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

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_services' 
ORDER BY ordinal_position;