create extension if not exists pgcrypto;

create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  display_order integer not null check (display_order > 0),
  is_active boolean not null default true
);

create table if not exists public.dishes (
  id text primary key,
  category_id text not null references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_in_paise integer not null check (price_in_paise >= 0),
  image_url text,
  image_source text,
  image_license text,
  image_status text not null default 'review' check (image_status in ('review', 'verified')),
  vegetarian_status text not null check (vegetarian_status in ('vegetarian', 'non_vegetarian', 'unverified')),
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dishes_category_available_idx on public.dishes(category_id, is_available);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  delivery_instructions text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address_snapshot jsonb not null,
  subtotal_in_paise integer not null check (subtotal_in_paise >= 0),
  delivery_fee_in_paise integer not null default 0 check (delivery_fee_in_paise >= 0),
  discount_in_paise integer not null default 0 check (discount_in_paise >= 0),
  tax_in_paise integer not null default 0 check (tax_in_paise >= 0),
  total_in_paise integer not null check (total_in_paise >= 0),
  payment_method text not null check (payment_method in ('cod', 'razorpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  order_status text not null default 'placed' check (order_status in ('placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id text references public.dishes(id) on delete set null,
  dish_name_snapshot text not null,
  unit_price_in_paise integer not null check (unit_price_in_paise >= 0),
  quantity integer not null check (quantity between 1 and 50),
  special_instructions text
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_reference text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  reservation_date date not null,
  start_time time not null,
  guest_count integer not null check (guest_count between 1 and 20),
  seating_preference text not null default 'no_preference',
  special_requests text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists reservations_date_time_idx on public.reservations(reservation_date, start_time);

create table if not exists public.reservation_slots (
  slot_date date not null,
  start_time time not null,
  capacity integer not null check (capacity >= 0),
  is_active boolean not null default false,
  primary key (slot_date, start_time)
);

create table if not exists public.restaurant_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pincodes text[] not null default '{}',
  delivery_fee_in_paise integer not null default 0 check (delivery_fee_in_paise >= 0),
  minimum_order_in_paise integer not null default 0 check (minimum_order_in_paise >= 0),
  is_active boolean not null default false
);

create table if not exists public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value integer not null check (discount_value > 0),
  is_active boolean not null default false,
  valid_from timestamptz,
  valid_until timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text unique,
  amount_in_paise integer not null check (amount_in_paise >= 0),
  status text not null check (status in ('created', 'authorized', 'captured', 'failed', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_events_created_idx on public.audit_events(created_at desc);

insert into public.restaurant_settings (key, value)
values
  ('opening_hours', '{"status":"pending_confirmation"}'::jsonb),
  ('delivery', '{"status":"not_configured"}'::jsonb),
  ('reservations', '{"status":"not_configured"}'::jsonb)
on conflict (key) do nothing;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role in ('staff', 'admin')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_slots enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.coupons enable row level security;
alter table public.payments enable row level security;
alter table public.audit_events enable row level security;

create policy "Public can read active categories" on public.categories for select using (is_active);
create policy "Public can read available dishes" on public.dishes for select using (is_available);
create policy "Staff can manage categories" on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can manage dishes" on public.dishes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Users can read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_staff());
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Staff can manage profiles" on public.profiles for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Users can read own addresses" on public.addresses for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "Users can manage own addresses" on public.addresses for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "Staff can manage orders" on public.orders for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Owners and staff can read order items" on public.order_items for select to authenticated using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "Users can read own reservations" on public.reservations for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "Staff can manage reservations" on public.reservations for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can read reservation slots" on public.reservation_slots for select to authenticated using (public.is_staff());
create policy "Staff can manage reservation slots" on public.reservation_slots for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can read settings" on public.restaurant_settings for select to authenticated using (public.is_staff());
create policy "Staff can manage settings" on public.restaurant_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can manage delivery zones" on public.delivery_zones for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can manage coupons" on public.coupons for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Owners and staff can read payments" on public.payments for select to authenticated using (public.is_staff() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "Staff can manage payments" on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can read audit events" on public.audit_events for select to authenticated using (public.is_staff());

revoke insert, update, delete on public.orders, public.order_items, public.reservations, public.payments from anon, authenticated;
revoke insert, update, delete on public.user_roles from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;
