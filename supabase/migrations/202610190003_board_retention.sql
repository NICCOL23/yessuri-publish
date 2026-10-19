begin;
alter table public.board_reports add column if not exists reviewed_at timestamptz;
create or replace function public.board_retention_tasks(operation text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,board_private,storage as $$
declare result jsonb;
begin
  if operation='candidates' then
    select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'paths',
      (select coalesce(jsonb_agg(p.storage_path),'[]'::jsonb) from public.board_photos p where p.question_id=q.id))),'[]'::jsonb)
      into result from (select id from public.board_questions where state='deleted' and deleted_at<now()-interval '30 days' limit 100) q;
    return result;
  elsif operation='orphans' then
    select coalesce(jsonb_agg(o.name),'[]'::jsonb) into result from
      (select name from storage.objects o where bucket_id='board-photos' and created_at<now()-interval '1 day'
        and not exists(select 1 from public.board_photos p where p.storage_path=o.name) limit 100) o;
    return result;
  elsif operation='expire' then
    delete from board_private.edit_sessions where expires_at<now();
    delete from board_private.rate_limits where window_start<now()-interval '48 hours';
    delete from board_private.audit where created_at<now()-interval '90 days';
    delete from public.board_reports where state='reviewed' and reviewed_at<now()-interval '90 days';
    return '{}'::jsonb;
  else raise exception 'unsupported operation'; end if;
end $$;
revoke all on function public.board_retention_tasks(text) from public,anon,authenticated;
grant execute on function public.board_retention_tasks(text) to service_role;
commit;
