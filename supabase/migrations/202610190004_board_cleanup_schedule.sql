-- Random cleanup secret is provisioned separately in Vault; never commit its value.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create or replace function public.board_cleanup_secret() returns text
language sql security definer set search_path=pg_catalog,vault as $$
  select decrypted_secret from vault.decrypted_secrets
  where name='yessuri_board_cleanup_20261019' order by created_at desc limit 1;
$$;
revoke all on function public.board_cleanup_secret() from public,anon,authenticated;
grant execute on function public.board_cleanup_secret() to service_role;
do $setup$
begin
  if exists(select 1 from vault.secrets where name='yessuri_board_cleanup_20261019') then
    perform cron.schedule('yessuri-board-retention','15 19 * * *',$job$
      select net.http_post(
        url:='https://buotlfllagjwxopnbeit.supabase.co/functions/v1/board-api?action=cleanup',
        headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-secret',
          (select decrypted_secret from vault.decrypted_secrets where name='yessuri_board_cleanup_20261019' order by created_at desc limit 1)),
        body:='{}'::jsonb);
    $job$);
  end if;
end $setup$;
commit;
