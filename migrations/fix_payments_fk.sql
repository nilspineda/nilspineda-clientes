-- Fix payments FK to reference user_services (not services)
-- The code joins payments -> user_services and uses user_services.id as the value

alter table public.payments drop constraint if exists payments_service_id_fkey;

alter table public.payments
  add constraint payments_service_id_fkey
  foreign key (service_id) references public.user_services(id)
  on delete set null;
