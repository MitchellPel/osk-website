-- OSK staging only. Keep these tables unavailable to anon/authenticated clients.
create table if not exists public.osk_products (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('brake','clutch','kit')),
  description text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  stock integer not null default 0 check (stock >= 0),
  fitment text not null default '',
  bike_model text not null default '',
  year_from integer,
  year_to integer,
  control_assembly text not null default '',
  fitment_verified boolean not null default false,
  active boolean not null default false,
  constraint osk_publish_complete check (not active or (fitment_verified and length(trim(fitment)) > 0 and bike_model = 'KTM 300 EXC' and year_from is not null and year_to is not null and year_from <= year_to and length(trim(control_assembly)) > 0 and price_cents > 0))
);

create table if not exists public.osk_orders (
  id text primary key,
  customer_name text not null,
  email text not null,
  phone text not null,
  pudo_point text not null,
  items_json text not null,
  total_cents integer not null check (total_cents > 0),
  payment_status text not null default 'not_started' check (payment_status in ('not_started','awaiting_confirmation','test_succeeded','test_failed')),
  fulfilment_status text not null default 'new' check (fulfilment_status in ('new','packing','sent','delivered','cancelled')),
  tracking_ref text not null default '',
  yoco_checkout_id text,
  created_at timestamptz not null default now()
);

create index if not exists osk_orders_created_at_idx on public.osk_orders (created_at desc);
alter table public.osk_products enable row level security;
alter table public.osk_orders enable row level security;
revoke all on public.osk_products, public.osk_orders from anon, authenticated;
grant select, insert, update on public.osk_products, public.osk_orders to service_role;
