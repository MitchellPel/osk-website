-- Additive OSK admin upgrade. Apply only to OSK staging after reviewing the schema.
begin;
alter table public.osk_products add column if not exists sku text;
alter table public.osk_products add column if not exists reorder_point integer not null default 5 check (reorder_point >= 0);
alter table public.osk_products add column if not exists archived boolean not null default false;
create unique index if not exists osk_products_sku_unique on public.osk_products(sku) where sku is not null and sku <> '';
alter table public.osk_orders add column if not exists internal_note text not null default '';

create table if not exists public.osk_activity (
  id uuid primary key default gen_random_uuid(), entity_type text not null,
  entity_id text not null, action text not null, details jsonb not null default '{}',
  actor text not null, created_at timestamptz not null default now()
);
create index if not exists osk_activity_created_idx on public.osk_activity(created_at desc);
create index if not exists osk_activity_entity_idx on public.osk_activity(entity_type,entity_id,created_at desc);
create table if not exists public.osk_inventory_movements (
  id uuid primary key default gen_random_uuid(), product_id text not null references public.osk_products(id),
  delta integer not null check(delta <> 0), stock_before integer not null check(stock_before >= 0),
  stock_after integer not null check(stock_after >= 0), reason text not null check(length(trim(reason)) between 3 and 500),
  actor text not null, created_at timestamptz not null default now(),
  check(stock_after = stock_before + delta)
);
create index if not exists osk_movements_product_idx on public.osk_inventory_movements(product_id,created_at desc);
alter table public.osk_activity enable row level security;
alter table public.osk_inventory_movements enable row level security;
revoke all on public.osk_activity,public.osk_inventory_movements from public,anon,authenticated,service_role;
grant select,insert on public.osk_activity,public.osk_inventory_movements to service_role;

create or replace function public.osk_log_admin_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare changed jsonb; actor_id text;
begin
  actor_id := coalesce(nullif(current_setting('request.headers',true),'')::jsonb ->> 'x-osk-actor','server');
  if tg_op='UPDATE' then
    select coalesce(jsonb_agg(k),'[]'::jsonb) into changed
    from jsonb_object_keys(to_jsonb(new)) as keys(k)
    where to_jsonb(new)->k is distinct from to_jsonb(old)->k;
    if changed='[]'::jsonb then return new; end if;
  else changed := '[]'::jsonb; end if;
  insert into public.osk_activity(entity_type,entity_id,action,details,actor)
  values(case when tg_table_name='osk_products' then 'product' else 'order' end,new.id,
    lower(tg_op),jsonb_build_object('changed_fields',changed),actor_id);
  return new;
end $$;
revoke all on function public.osk_log_admin_change() from public,anon,authenticated;
grant execute on function public.osk_log_admin_change() to service_role;
drop trigger if exists osk_products_audit on public.osk_products;
create trigger osk_products_audit after insert or update on public.osk_products for each row execute function public.osk_log_admin_change();
drop trigger if exists osk_orders_audit on public.osk_orders;
create trigger osk_orders_audit after insert or update on public.osk_orders for each row execute function public.osk_log_admin_change();

create or replace function public.osk_adjust_stock(p_product_id text,p_delta integer,p_expected integer,p_reason text)
returns setof public.osk_products language plpgsql security invoker set search_path = '' as $$
declare item public.osk_products%rowtype; actor_id text;
begin
  if p_delta is null or p_delta=0 or abs(p_delta::bigint)>100000 or p_expected is null or p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'Invalid stock adjustment'; end if;
  select * into item from public.osk_products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  if item.stock<>p_expected then raise exception 'Stock changed; refresh before adjusting'; end if;
  if item.stock+p_delta<0 then raise exception 'Insufficient stock'; end if;
  actor_id:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb ->> 'x-osk-actor','server');
  update public.osk_products set stock=stock+p_delta where id=p_product_id;
  insert into public.osk_inventory_movements(product_id,delta,stock_before,stock_after,reason,actor)
  values(p_product_id,p_delta,item.stock,item.stock+p_delta,trim(p_reason),actor_id);
  return query select * from public.osk_products where id=p_product_id;
end $$;
revoke all on function public.osk_adjust_stock(text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.osk_adjust_stock(text,integer,integer,text) to service_role;
commit;
