-- ============================================================
-- Epilyum — Sales, Instalments & Expenses
-- Run once in Supabase → SQL Editor
--
-- Money is never converted. A sale is priced in one currency, and
-- everything attached to it — the prepayment, every instalment, the
-- remainder — stays in that same currency. Totals across sales are
-- therefore reported per currency, never added together.
--
-- WARNING: the reset block drops the previous tables and their data.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- reset ----------
drop view  if exists public.expense_fund;
drop view  if exists public.client_balances;
drop view  if exists public.sale_balances;
drop table if exists public.expenses;
drop table if exists public.payments;
drop table if exists public.sales;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user','admin')),
  created_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists full_name text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ---------- clients ----------
-- Created and edited by the admin only. Reps pick from this list.
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  city        text not null check (city in (
                'Baghdad','Basra','Nineveh','Erbil','Sulaymaniyah','Duhok','Kirkuk',
                'Karbala','Najaf','Dhi Qar','Babil','Anbar','Salah al-Din','Diyala',
                'Wasit','Al-Qadisiyyah','Maysan','Al-Muthanna')),
  speciality  text check (speciality in ('Dermatologist','Plastic Surgeon','Other')),
  note        text,
  created_by  uuid references public.profiles(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- `create table if not exists` skips a table that already exists, so a
-- column added in a later revision would never appear. Add it explicitly.
alter table public.clients add column if not exists note text;
alter table public.clients add column if not exists speciality text;
alter table public.clients add column if not exists phone text;

create unique index if not exists clients_phone_unique
  on public.clients (phone) where phone is not null and phone <> '';
create index if not exists clients_name_idx on public.clients using gin (name gin_trgm_ops);

-- ---------- sales ----------
-- One row per purchase. A clinic that buys again gets another row, so each
-- deal keeps its own currency, price, prepayment and instalment history.
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  currency       text not null default 'usd' check (currency in ('usd','iqd')),
  devices        text[] not null default '{}',
  -- how many units of each model, e.g. {"Epilyum Hair Removal": 2}
  device_qty     jsonb not null default '{}'::jsonb,
  -- models handed over free; always a subset of `devices`, and they add
  -- nothing to the price
  gift_devices   text[] not null default '{}',
  device_count   integer not null default 1 check (device_count > 0),
  total_price    numeric(16,2) not null check (total_price > 0),
  prepaid        numeric(16,2) not null default 0 check (prepaid >= 0),
  -- who received the prepayment; the expenses pot is funded by instalments
  -- only, so it is not an option here
  prepaid_allocation text check (prepaid_allocation in ('ibo','rasty')),
  sale_date      date not null default current_date,
  note           text,
  created_by     uuid references public.profiles(id) default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint prepaid_within_total check (prepaid <= total_price),
  constraint gifts_are_listed check (gift_devices <@ devices),
  constraint devices_are_known check (devices <@ array[
    'Epilyum Hair Removal','Epilyum Axisone CO2','Epilyum Axisone & Thulium',
    'Epilyum Pictron11','Epilyum IPL Revive','Epilyum Thermilif',
    'Epilyum Thermiq','Epilyum AI Reveal','Epilyum Cryolipolysis','RF',
    'Pelvora','Cervera','UPS','Hydra']::text[])
);
create index if not exists sales_client_idx on public.sales (client_id);

-- ---------- payments (the monthly instalments a rep collects) ----------
-- `allocation` records who the cash was handed to. Money marked
-- 'expenses' is what funds the expenses pot below. The currency is copied
-- from the sale by a trigger, so an instalment can never drift from the
-- deal it pays down.
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  currency     text not null default 'usd' check (currency in ('usd','iqd')),
  date         date not null default current_date,
  amount       numeric(16,2) not null check (amount > 0),
  allocation   text not null check (allocation in ('ibo','rasty','expenses')),
  invoice_no   text,
  note         text,
  user_id      uuid not null references public.profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index if not exists payments_sale_idx   on public.payments (sale_id);
create index if not exists payments_client_idx on public.payments (client_id);
create index if not exists payments_date_idx   on public.payments (date desc);

create or replace function public.set_payment_currency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select s.currency into new.currency from public.sales s where s.id = new.sale_id;
  return new;
end;
$$;

drop trigger if exists trg_payment_currency on public.payments;
create trigger trg_payment_currency
  before insert or update of sale_id on public.payments
  for each row execute function public.set_payment_currency();

-- ---------- expenses (spent out of the expenses pot) ----------
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  category   text not null,
  -- who the commission was for; only set when the category is نسبە
  employee   text,
  currency   text not null default 'usd' check (currency in ('usd','iqd')),
  amount     numeric(16,2) not null check (amount > 0),
  note       text,
  user_id    uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.expenses add column if not exists employee text;

create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_employee_idx on public.expenses (employee)
  where employee is not null;

-- ---------- derived balances ----------
-- Remainders are never stored. A stored remainder drifts the moment a
-- payment is edited or deleted; derived, it always agrees with history.

create or replace view public.sale_balances
with (security_invoker = on) as
select
  s.id, s.client_id, s.currency, s.devices, s.device_qty, s.gift_devices,
  s.device_count, s.sale_date, s.note, s.total_price, s.prepaid,
  s.prepaid_allocation, s.created_at,
  coalesce(p.collected, 0)                          as collected,
  s.prepaid + coalesce(p.collected, 0)              as received,
  s.total_price - s.prepaid - coalesce(p.collected, 0) as remaining,
  coalesce(p.payment_count, 0)                      as payment_count,
  p.last_payment_date
from public.sales s
left join (
  select sale_id,
         sum(amount)  as collected,
         count(*)     as payment_count,
         max(date)    as last_payment_date
  from public.payments group by sale_id
) p on p.sale_id = s.id;

-- Per client, split by currency: two currencies are never added together.
create or replace view public.client_balances
with (security_invoker = on) as
select
  c.id, c.name, c.phone, c.city, c.speciality, c.created_at,
  coalesce(sum(sb.total_price) filter (where sb.currency = 'usd'), 0) as total_price_usd,
  coalesce(sum(sb.total_price) filter (where sb.currency = 'iqd'), 0) as total_price_iqd,
  coalesce(sum(sb.prepaid)     filter (where sb.currency = 'usd'), 0) as prepaid_usd,
  coalesce(sum(sb.prepaid)     filter (where sb.currency = 'iqd'), 0) as prepaid_iqd,
  coalesce(sum(sb.collected)   filter (where sb.currency = 'usd'), 0) as collected_usd,
  coalesce(sum(sb.collected)   filter (where sb.currency = 'iqd'), 0) as collected_iqd,
  coalesce(sum(sb.received)    filter (where sb.currency = 'usd'), 0) as received_usd,
  coalesce(sum(sb.received)    filter (where sb.currency = 'iqd'), 0) as received_iqd,
  coalesce(sum(sb.remaining)   filter (where sb.currency = 'usd'), 0) as remaining_usd,
  coalesce(sum(sb.remaining)   filter (where sb.currency = 'iqd'), 0) as remaining_iqd,
  coalesce(sum(sb.device_count), 0) as device_count,
  count(sb.id)                      as sale_count,
  max(sb.last_payment_date)         as last_payment_date
from public.clients c
left join public.sale_balances sb on sb.client_id = c.id
group by c.id, c.name, c.phone, c.city, c.speciality, c.created_at;

-- The expenses pot, one row per currency.
create or replace view public.expense_fund
with (security_invoker = on) as
select
  cur.currency,
  coalesce((select sum(p.amount) from public.payments p
            where p.allocation = 'expenses' and p.currency = cur.currency), 0) as fund_in,
  coalesce((select sum(e.amount) from public.expenses e
            where e.currency = cur.currency), 0) as spent,
  coalesce((select sum(p.amount) from public.payments p
            where p.allocation = 'expenses' and p.currency = cur.currency), 0)
    - coalesce((select sum(e.amount) from public.expenses e
                where e.currency = cur.currency), 0) as remaining
from (values ('usd'), ('iqd')) as cur(currency);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
alter table public.sales    enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- clients: everyone reads, only the admin writes
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated using (true);

drop policy if exists clients_admin_write on public.clients;
create policy clients_admin_write on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- sales: everyone reads, only the admin writes
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
  for select to authenticated using (true);

drop policy if exists sales_admin_write on public.sales;
create policy sales_admin_write on public.sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- payments: reps record their own and may fix them for 24h; admin does anything
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated using (true);

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists payments_edit_own_24h on public.payments;
create policy payments_edit_own_24h on public.payments
  for update to authenticated
  using (user_id = auth.uid() and created_at > now() - interval '24 hours')
  with check (user_id = auth.uid());

drop policy if exists payments_delete_own_24h on public.payments;
create policy payments_delete_own_24h on public.payments
  for delete to authenticated
  using (user_id = auth.uid() and created_at > now() - interval '24 hours');

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- expenses: same shape as payments
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated using (true);

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists expenses_edit_own_24h on public.expenses;
create policy expenses_edit_own_24h on public.expenses
  for update to authenticated
  using (user_id = auth.uid() and created_at > now() - interval '24 hours')
  with check (user_id = auth.uid());

drop policy if exists expenses_delete_own_24h on public.expenses;
create policy expenses_delete_own_24h on public.expenses
  for delete to authenticated
  using (user_id = auth.uid() and created_at > now() - interval '24 hours');

drop policy if exists expenses_admin_all on public.expenses;
create policy expenses_admin_all on public.expenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Make yourself an admin:
--   update public.profiles set role = 'admin' where email = 'you@epilyum.com';
-- ============================================================
