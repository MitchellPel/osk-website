-- Disposable transaction: no test products or events survive the rollback.
begin;
set local statement_timeout='10s';
select set_config('request.headers','{"x-osk-actor":"schema-verification"}',true);
set local role service_role;
do $$
declare test_id text:='osk-admin-test-'||gen_random_uuid()::text; qty integer;
begin
  insert into public.osk_products(id,name,kind,description,stock) values(test_id,'Disposable admin verification','brake','Test only',10);
  perform public.osk_adjust_stock(test_id,5,10,'Verification receipt');
  select stock into qty from public.osk_products where id=test_id;
  if qty<>15 then raise exception 'Wrong stock balance'; end if;
  if (select count(*) from public.osk_inventory_movements where product_id=test_id)<>1 then raise exception 'Movement missing'; end if;
  if (select count(*) from public.osk_activity where entity_id=test_id)<>2 then raise exception 'Audit events missing'; end if;
  begin
    perform public.osk_adjust_stock(test_id,1,10,'Stale count test');
    raise exception 'Expected stale guard';
  exception when raise_exception then
    if sqlerrm not like 'Stock changed%' then raise; end if;
  end;
  begin
    perform public.osk_adjust_stock(test_id,-16,15,'Negative stock test');
    raise exception 'Expected negative stock guard';
  exception when raise_exception then
    if sqlerrm<>'Insufficient stock' then raise; end if;
  end;
  if has_table_privilege('service_role','public.osk_activity','UPDATE') or has_table_privilege('service_role','public.osk_activity','DELETE') then raise exception 'Audit history is mutable'; end if;
  if has_function_privilege('anon','public.osk_adjust_stock(text,integer,integer,text)','EXECUTE') then raise exception 'Anon can adjust stock'; end if;
end $$;
rollback;
select 'PASS: stock, ledger, audit, stale counts, negative stock and permissions; test data rolled back' as verification;
