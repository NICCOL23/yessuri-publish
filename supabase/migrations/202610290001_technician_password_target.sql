-- Password verification for a selected application. Never search all applications by password.
begin;
create or replace function public.technician_password_target(p_id uuid)
returns jsonb language sql stable security invoker
set search_path=pg_catalog,technician_private as $$
 select coalesce((select jsonb_build_object('id',id,'password_hash',password_hash)
 from technician_private.applications where id=p_id and expires_at>now()),'{}'::jsonb);
$$;
revoke all on function public.technician_password_target(uuid) from public,anon,authenticated;
grant execute on function public.technician_password_target(uuid) to service_role;
-- Keep the existing isolated technician test environment separate from production.
do $migration$
begin
 if to_regclass('technician_private_test.applications') is not null then
  execute $function$
   create or replace function public.technician_password_target_test(p_id uuid)
   returns jsonb language sql stable security invoker
   set search_path=pg_catalog,technician_private_test as $body$
    select coalesce((select jsonb_build_object('id',id,'password_hash',password_hash)
    from technician_private_test.applications where id=p_id and expires_at>now()),'{}'::jsonb);
   $body$;
  $function$;
  revoke all on function public.technician_password_target_test(uuid) from public,anon,authenticated;
  grant execute on function public.technician_password_target_test(uuid) to service_role;
 end if;
end;
$migration$;
commit;
