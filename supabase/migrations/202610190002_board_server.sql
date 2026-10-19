begin;
-- Only the server service role may call this helper. Private schema stays outside Data API.
create or replace function public.board_server_private(operation text, payload jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, board_private as $$
declare result jsonb; n integer; qid uuid;
begin
  case operation
  when 'rate' then
    insert into board_private.rate_limits(bucket, window_start, attempts)
    values (payload->>'bucket', to_timestamp((payload->>'window')::bigint), 1)
    on conflict(bucket) do update set
      attempts = case when rate_limits.window_start = excluded.window_start then rate_limits.attempts + 1 else 1 end,
      window_start = excluded.window_start
    returning attempts into n;
    return jsonb_build_object('allowed', n <= (payload->>'limit')::integer);
  when 'credential' then
    select jsonb_build_object('hash', password_hash) into result from board_private.credentials where question_id=(payload->>'id')::uuid;
    return coalesce(result, '{}'::jsonb);
  when 'session_create' then
    insert into board_private.edit_sessions(token_hash, question_id, expires_at)
      values(payload->>'hash', (payload->>'id')::uuid, now()+interval '15 minutes');
    return '{}'::jsonb;
  when 'session_check' then
    select jsonb_build_object('id', question_id) into result from board_private.edit_sessions
      where token_hash=payload->>'hash' and expires_at>now();
    return coalesce(result, '{}'::jsonb);
  when 'create' then
    qid := (payload->>'id')::uuid;
    insert into public.board_questions(id,request_id,nickname,district,group_id,work_id,title,body,state)
      values(qid,(payload->>'request_id')::uuid,payload->>'nickname',payload->>'district',payload->>'group_id',
        nullif(payload->>'work_id',''),payload->>'title',payload->>'body','published');
    insert into board_private.credentials(question_id,password_hash) values(qid,payload->>'password_hash');
    insert into public.board_photos(id,question_id,storage_path,position,content_type,bytes)
      select (x->>'id')::uuid,qid,x->>'storage_path',(x->>'position')::smallint,x->>'content_type',(x->>'bytes')::integer
      from jsonb_array_elements(payload->'photos') x;
    return jsonb_build_object('id',qid);
  when 'edit' then
    qid := (payload->>'id')::uuid;
    perform 1 from public.board_questions where id=qid and state='published' for update;
    if not found then raise exception 'question unavailable'; end if;
    update public.board_questions set nickname=payload->>'nickname',district=payload->>'district',group_id=payload->>'group_id',
      work_id=nullif(payload->>'work_id',''),title=payload->>'title',body=payload->>'body',updated_at=now(),edited_at=now() where id=qid;
    delete from public.board_photos where question_id=qid;
    insert into public.board_photos(id,question_id,storage_path,position,content_type,bytes)
      select (x->>'id')::uuid,qid,x->>'storage_path',(x->>'position')::smallint,x->>'content_type',(x->>'bytes')::integer
      from jsonb_array_elements(payload->'photos') x;
    return jsonb_build_object('id',qid);
  when 'delete' then
    qid := (payload->>'id')::uuid;
    update public.board_questions set state='deleted',deleted_at=now(),updated_at=now() where id=qid;
    delete from board_private.edit_sessions where question_id=qid;
    return '{}'::jsonb;
  when 'audit' then
    insert into board_private.audit(actor_id,question_id,action) values(nullif(payload->>'actor','')::uuid,nullif(payload->>'id','')::uuid,payload->>'action');
    return '{}'::jsonb;
  else raise exception 'unsupported operation';
  end case;
end $$;
revoke all on function public.board_server_private(text,jsonb) from public,anon,authenticated;
grant execute on function public.board_server_private(text,jsonb) to service_role;
commit;
