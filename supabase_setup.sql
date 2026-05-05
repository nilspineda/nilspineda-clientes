-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  whatsapp text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USER_SERVICES
create table public.user_services (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete cascade not null,
  status text default 'pending' check (status in ('active', 'pending', 'expired', 'warning')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone
);

-- PAYMENTS
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete set null,
  amount numeric not null,
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  payment_method text,
  status text default 'paid' check (status in ('paid', 'pending', 'failed')),
  invoice_url text
);

-- REVIEW_LINKS
create table public.review_links (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null
);

-- RLS
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.user_services enable row level security;
alter table public.payments enable row level security;
alter table public.review_links enable row level security;

-- POLICIES: PROFILES
create policy "Users can view their own profile" on public.profiles for select using ( auth.uid() = id );
create policy "Users can update their own profile" on public.profiles for update using ( auth.uid() = id );
create policy "Admin can do all on profiles" on public.profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- POLICIES: SERVICES
create policy "Everyone can view services" on public.services for select using ( true );
create policy "Admin can do all on services" on public.services for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- POLICIES: USER_SERVICES
create policy "Users can view their own user_services" on public.user_services for select using ( auth.uid() = user_id );
create policy "Admin can do all on user_services" on public.user_services for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- POLICIES: PAYMENTS
create policy "Users can view their own payments" on public.payments for select using ( auth.uid() = user_id );
create policy "Admin can do all on payments" on public.payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- POLICIES: REVIEW_LINKS
create policy "Users can view their own review links" on public.review_links for select using ( auth.uid() = user_id );
create policy "Admin can do all on review links" on public.review_links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- TRIGGER FOR NEW USERS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'User'), 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STORAGE
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', true);

create policy "Users can read their own invoices" on storage.objects for select using (
  bucket_id = 'invoices' and (auth.uid()::text = (storage.foldername(name))[1] or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
);

create policy "Admin can insert invoices" on storage.objects for insert with check (
  bucket_id = 'invoices' and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update invoices" on storage.objects for update using (
  bucket_id = 'invoices' and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can delete invoices" on storage.objects for delete using (
  bucket_id = 'invoices' and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
