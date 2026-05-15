-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  whatsapp text,
  email text,
  active boolean default true,
  accesos text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc' :: text, now()) not null
);

-- SERVICES
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text default 'dominio' check (
    type in (
      'dominio',
      'hosting',
      'correo',
      'membresia',
      'personalizado'
    )
  ),
  description text,
  price numeric,
  created_at timestamp with time zone default timezone('utc' :: text, now()) not null
);

-- USER_SERVICES
create table public.user_services (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  price numeric,
  owner integer default 0,
  status text default 'pending' check (
    status in ('active', 'pending', 'expired', 'warning')
  ),
  expires_at timestamp with time zone,
  next_billing_date timestamp with time zone,
  url_dominio text,
  notes text,
  accesos text,
  created_at timestamp with time zone default timezone('utc' :: text, now()) not null
);

-- PAYMENTS
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  service_id uuid references public.services(id) on delete
  set
    null,
    amount numeric not null,
    payment_date timestamp with time zone default timezone('utc' :: text, now()) not null,
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

-- SETTINGS
create table public.settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value text not null,
  created_at timestamp with time zone default timezone('utc' :: text, now()) not null
);

-- Insert default settings
insert into
  public.settings (key, value)
values
  ('whatsapp_support', '573167195500'),
  (
    'google_review_url',
    'https://g.page/r/CX5jIkitMOE2EBM/review'
  ) on conflict (key) do nothing;

-- TICKETS
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  description text,
  status text default 'open' check (status in ('open', 'pending', 'closed')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamp with time zone default timezone('utc' :: text, now()) not null,
  updated_at timestamp with time zone default timezone('utc' :: text, now()) not null
);

-- RLS
alter table
  public.profiles enable row level security;

alter table
  public.services enable row level security;

alter table
  public.user_services enable row level security;

alter table
  public.payments enable row level security;

alter table
  public.review_links enable row level security;

alter table
  public.settings enable row level security;

alter table
  public.tickets enable row level security;

-- POLICIES: PROFILES
create policy "Users can view their own profile" on public.profiles for
select
  using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles for
update
  using (auth.uid() = id);

create policy "Admin can do all on profiles" on public.profiles for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- POLICIES: SERVICES
create policy "Everyone can view services" on public.services for
select
  using (true);

create policy "Admin can do all on services" on public.services for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- POLICIES: USER_SERVICES
create policy "Users can view their own user_services" on public.user_services for
select
  using (auth.uid() = user_id);

create policy "Admin can do all on user_services" on public.user_services for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- Allow regular users to insert their own user_services (must set user_id = auth.uid())
create policy "Users can insert their own user_services" on public.user_services for
insert
  with check (auth.uid() = user_id);

-- Allow regular users to update/delete their own user_services
create policy "Users can update their own user_services" on public.user_services for
update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own user_services" on public.user_services for delete using (auth.uid() = user_id);

-- POLICIES: PAYMENTS
create policy "Users can view their own payments" on public.payments for
select
  using (auth.uid() = user_id);

create policy "Admin can do all on payments" on public.payments for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- POLICIES: REVIEW_LINKS
create policy "Users can view their own review links" on public.review_links for
select
  using (auth.uid() = user_id);

create policy "Admin can do all on review links" on public.review_links for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- POLICIES: SETTINGS
create policy "Everyone can read settings" on public.settings for
select
  using (true);

create policy "Admin can do all on settings" on public.settings for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- POLICIES: TICKETS
create policy "Users can view their own tickets" on public.tickets for
select
  using (auth.uid() = user_id);

create policy "Users can create tickets" on public.tickets for
insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tickets" on public.tickets for
update
  using (auth.uid() = user_id);

create policy "Admin can do all on tickets" on public.tickets for all using (
  exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- TRIGGER FOR NEW USERS
create
or replace function public.handle_new_user() returns trigger language plpgsql security definer
set
  search_path = public as $ $ begin
insert into
  public.profiles (id, name, role, active)
values
  (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'User'),
    'user',
    true
  );

return new;

end;

$ $;

create trigger on_auth_user_created
after
insert
  on auth.users for each row execute procedure public.handle_new_user();

-- STORAGE
insert into
  storage.buckets (id, name, public)
values
  ('invoices', 'invoices', true);

create policy "Users can read their own invoices" on storage.objects for
select
  using (
    bucket_id = 'invoices'
    and (
      auth.uid() :: text = (storage.foldername(name)) [1]
      or exists (
        select
          1
        from
          profiles
        where
          id = auth.uid()
          and role = 'admin'
      )
    )
  );

create policy "Admin can insert invoices" on storage.objects for
insert
  with check (
    bucket_id = 'invoices'
    and exists (
      select
        1
      from
        profiles
      where
        id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Admin can update invoices" on storage.objects for
update
  using (
    bucket_id = 'invoices'
    and exists (
      select
        1
      from
        profiles
      where
        id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Admin can delete invoices" on storage.objects for delete using (
  bucket_id = 'invoices'
  and exists (
    select
      1
    from
      profiles
    where
      id = auth.uid()
      and role = 'admin'
  )
);

-- ADD COLUMN FOR USER_SERVICE REFERENCE IN PAYMENTS
alter table public.payments add column if not exists user_service_id uuid references public.user_services(id) on delete set null;

-- FUNCTION: Create recurring payments for a user service
create or replace function public.create_recurring_payments(
  p_user_service_id uuid,
  p_months integer default 12
)
returns void
language plpgsql
security definer
as $$
declare
  v_price numeric;
  v_user_id uuid;
  v_service_id uuid;
  v_next_date timestamp;
  v_count integer := 0;
begin
  -- Get user service details
  SELECT user_id, service_id, price, next_billing_date
  INTO v_user_id, v_service_id, v_price, v_next_date
  FROM user_services
  WHERE id = p_user_service_id;

  -- If no next_billing_date, start from today
  if v_next_date is null then
    v_next_date := current_date;
  end if;

  -- If no price, don't create payments
  if v_price is null or v_price = 0 then
    raise notice 'No price defined for user_service %', p_user_service_id;
    return;
  end if;

  -- Check if payments already exist for this user_service
  if exists (select 1 from payments where user_service_id = p_user_service_id) then
    raise notice 'Payments already exist for user_service %', p_user_service_id;
    return;
  end if;

  -- Create payments for the specified months
  while v_count < p_months loop
    insert into payments (
      user_id,
      user_service_id,
      service_id,
      amount,
      payment_date,
      status
    ) values (
      v_user_id,
      p_user_service_id,
      v_service_id,
      v_price,
      v_next_date,
      'pending'
    );

    -- Advance to next month
    v_next_date := v_next_date + interval '1 month';
    v_count := v_count + 1;
  end loop;

  -- Update next_billing_date to the next unpaid month
  update user_services
  set next_billing_date = (
    select min(payment_date)
    from payments
    where user_service_id = p_user_service_id
    and status = 'pending'
  )
  where id = p_user_service_id;
end;
$$;

-- FUNCTION: Update pending payments amount when price changes
create or replace function public.update_pending_payments_amount(p_user_service_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_price numeric;
begin
  -- Get current price
  select price into v_price from user_services where id = p_user_service_id;

  if v_price is null or v_price = 0 then
    return;
  end if;

  -- Update only pending payments (not paid ones)
  update payments
  set amount = v_price
  where user_service_id = p_user_service_id
  and status = 'pending';
end;
$$;

-- FUNCTION: Get payment statistics for a user service
create or replace function public.get_user_service_payment_stats(p_user_service_id uuid)
returns table (
  total_payments bigint,
  paid_payments bigint,
  pending_payments bigint,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    count(*) as total_payments,
    count(*) filter (where status = 'paid') as paid_payments,
    count(*) filter (where status = 'pending') as pending_payments,
    coalesce(sum(amount), 0) as total_amount,
    coalesce(sum(amount) filter (where status = 'paid'), 0) as paid_amount,
    coalesce(sum(amount) filter (where status = 'pending'), 0) as pending_amount
  from payments
  where user_service_id = p_user_service_id;
end;
$$;