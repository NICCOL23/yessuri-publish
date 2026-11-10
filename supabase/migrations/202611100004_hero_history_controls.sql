begin;
alter table technician_private.hero_cms_revisions_v1 add column if not exists hidden boolean not null default false;
alter table technician_private.hero_cms_revisions_slide2_v1 add column if not exists hidden boolean not null default false;
alter table technician_private.hero_cms_revisions_slide3_v1 add column if not exists hidden boolean not null default false;
create table if not exists technician_private.hero_history_commands_v1(
 operation_id uuid primary key,operator_id uuid not null,request_digest text not null check(request_digest~'^[a-f0-9]{64}$'),
 slide integer not null check(slide in (1,2,3)),action text not null check(action in ('hide','delete')),revision_id uuid not null,created_at timestamptz not null default now()
);
alter table technician_private.hero_history_commands_v1 enable row level security;
revoke all on technician_private.hero_history_commands_v1 from public,anon,authenticated,service_role;
grant select,insert on technician_private.hero_history_commands_v1 to service_role;
-- Existing revision tables already grant SELECT/INSERT; only the protected RPC uses UPDATE/DELETE.
grant update(hidden),delete on technician_private.hero_cms_revisions_v1,technician_private.hero_cms_revisions_slide2_v1,technician_private.hero_cms_revisions_slide3_v1 to service_role;
create or replace function public.technician_hero_history_v1(op text,p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype; slide_id integer; revisions_table text; state_table text; current_version bigint;
 target_id uuid; command_id uuid; prior technician_private.hero_history_commands_v1%rowtype; record_action text; record_version bigint; latest_version bigint; result jsonb;
begin
 s=technician_private.require_admin_v2(p->>'hash');
 if coalesce(p->>'slide','') not in ('1','2','3') then raise exception 'invalid hero slide';end if;
 slide_id=(p->>'slide')::integer;
 revisions_table=case slide_id when 1 then 'hero_cms_revisions_v1' when 2 then 'hero_cms_revisions_slide2_v1' else 'hero_cms_revisions_slide3_v1' end;
 state_table=case slide_id when 1 then 'hero_cms_state_v1' when 2 then 'hero_cms_state_slide2_v1' else 'hero_cms_state_slide3_v1' end;
 if op='list' then
  execute format('select jsonb_build_object(''items'',coalesce(jsonb_agg(jsonb_build_object(''id'',id,''version'',version,''hidden'',hidden,''protected'',action=''original'' or version=latest) order by version desc),''[]''::jsonb)) from (select id,version,hidden,action,max(version) over() latest from technician_private.%I order by version desc limit 100) r',revisions_table) into result;
  return result;
 end if;
 if op not in ('hide','delete') or coalesce(p->>'operationId','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  or coalesce(p->>'revisionId','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  or coalesce(p->>'requestDigest','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid hero history request';end if;
 if op='hide' and jsonb_typeof(p->'hidden') is distinct from 'boolean' then raise exception 'invalid hidden flag';end if;
 if op='delete' and p->'confirmed' is distinct from 'true'::jsonb then raise exception 'delete confirmation required';end if;
 command_id=(p->>'operationId')::uuid;target_id=(p->>'revisionId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(command_id::text,9111));
 select * into prior from technician_private.hero_history_commands_v1 where operation_id=command_id;
 if found then
  if prior.operator_id<>s.admin_id or prior.request_digest is distinct from p->>'requestDigest' or prior.slide<>slide_id or prior.action<>op or prior.revision_id<>target_id then raise exception 'command conflict';end if;
  return jsonb_build_object('applied',true);
 end if;
 execute format('select version from technician_private.%I where singleton for update',state_table) into current_version;
 if coalesce(p->>'version','') !~ '^[0-9]{1,15}$' or (p->>'version')::bigint is distinct from current_version then raise exception 'version conflict';end if;
 execute format('select action,version from technician_private.%I where id=$1 for update',revisions_table) into record_action,record_version using target_id;
 if record_version is null then raise exception 'not found';end if;
 if op='delete' then
  execute format('select max(version) from technician_private.%I',revisions_table) into latest_version;
  if record_action='original' or record_version=latest_version then raise exception 'protected revision';end if;
  execute format('delete from technician_private.%I where id=$1',revisions_table) using target_id;
 else
  execute format('update technician_private.%I set hidden=$1 where id=$2',revisions_table) using (p->>'hidden')::boolean,target_id;
 end if;
 insert into technician_private.hero_history_commands_v1(operation_id,operator_id,request_digest,slide,action,revision_id) values(command_id,s.admin_id,p->>'requestDigest',slide_id,op,target_id);
 insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'hero','hero-history-'||op);
 return jsonb_build_object('applied',true);
end;$$;
revoke all on function public.technician_hero_history_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.technician_hero_history_v1(text,jsonb) to service_role;
commit;
