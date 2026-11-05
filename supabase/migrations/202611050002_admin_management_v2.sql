-- Additional admin-only controls. No application/profile rows changed by installation.
begin;
alter table technician_private.sessions add column if not exists last_active_at timestamptz;
create or replace function technician_private.init_admin_activity_v2() returns trigger language plpgsql set search_path=pg_catalog as $$
begin if new.role='admin' then new.last_active_at=now();end if;return new;end;$$;
drop trigger if exists init_admin_activity_v2 on technician_private.sessions;
create trigger init_admin_activity_v2 before insert on technician_private.sessions for each row execute function technician_private.init_admin_activity_v2();
create or replace function technician_private.require_admin_v2(p_hash text) returns technician_private.sessions language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype;begin
 select ss.* into s from technician_private.sessions ss join technician_private.admins ad on ad.user_id=ss.admin_id where ss.hash=p_hash and ss.role='admin' and ad.active and ss.expires_at>now() and ss.last_active_at>now()-interval '15 minutes';
 if not found then raise exception 'permission denied';end if;return s;end;$$;
create table if not exists technician_private.admin_commands_v2(operation_id uuid primary key,operator_id uuid not null,request_digest text not null,profile_id text,created_at timestamptz not null default now());
create table if not exists technician_private.admin_security_events_v2(id uuid primary key default gen_random_uuid(),event text not null check(event in('login-failure','access-denied','session-expired')),operator_id uuid,created_at timestamptz not null default now());
create table if not exists technician_private.public_file_jobs_v2(storage_path text primary key,profile_id text not null,image_url text not null,operation_id uuid not null,operator_id uuid not null,status text not null check(status in('staged','attached','pending','processing','done')),created_at timestamptz not null default now(),lease_until timestamptz,attempts integer not null default 0,request_digest text not null default '',check(storage_path ~ '^public-profiles/[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$'));
alter table technician_private.admin_commands_v2 enable row level security;
alter table technician_private.admin_security_events_v2 enable row level security;
alter table technician_private.public_file_jobs_v2 enable row level security;
revoke all on technician_private.admin_commands_v2,technician_private.admin_security_events_v2,technician_private.public_file_jobs_v2 from public,anon,authenticated;
grant select,insert,update,delete on technician_private.admin_commands_v2,technician_private.admin_security_events_v2,technician_private.public_file_jobs_v2 to service_role;

create or replace function technician_private.command_replay_v2(operator uuid,p jsonb) returns boolean language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare existing technician_private.admin_commands_v2%rowtype; opid uuid;begin
 if p->>'operationId' is null then return false;end if;opid=(p->>'operationId')::uuid;perform pg_advisory_xact_lock(hashtextextended(opid::text,42));
 select * into existing from technician_private.admin_commands_v2 where operation_id=opid;
 if not found then return false;end if;
 if existing.operator_id<>operator or existing.request_digest is distinct from p->>'requestDigest' then raise exception 'command conflict';end if;return true;end;$$;
create or replace function technician_private.command_finish_v2(operator uuid,p jsonb,target text) returns void language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
begin if p->>'operationId' is not null then
 if coalesce(p->>'requestDigest','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid digest';end if;
 insert into technician_private.admin_commands_v2(operation_id,operator_id,request_digest,profile_id) values((p->>'operationId')::uuid,operator,p->>'requestDigest',target);end if;end;$$;
create or replace function public.technician_admin_command_v2(p_hash text,operation_id uuid,request_digest text) returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype;c technician_private.admin_commands_v2%rowtype;begin
 s=technician_private.require_admin_v2(p_hash);select * into c from technician_private.admin_commands_v2 q where q.operation_id=technician_admin_command_v2.operation_id;
 if not found then return jsonb_build_object('processed',false);end if;if c.operator_id<>s.admin_id or c.request_digest is distinct from request_digest then raise exception 'command conflict';end if;return jsonb_build_object('processed',true);end;$$;
create or replace function technician_private.validate_classification_v2(items jsonb,previous jsonb,kind text) returns void language plpgsql security invoker set search_path=pg_catalog as $$
declare allowed text[];item text;begin
 allowed=case when kind='fields' then array['욕실·설비','도배','장판','싱크대·붙박이장','보일러','누수·수도','하수구·변기','타일','페인트','목공','청소','이사','철거','전기·조명','문·창호','열쇠·도어락','에어컨','CCTV 설치','TV·LED 모니터 수리','컴퓨터·IT'] else array['전체','강서구','금정구','남구','동구','동래구','부산진구','북구','사상구','사하구','서구','수영구','연제구','영도구','중구','해운대구','기장군'] end;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)=0 or jsonb_array_length(items)>30 then raise exception 'invalid classification';end if;
 for item in select jsonb_array_elements_text(items) loop
 if item is null or length(item)>100 or (not(item=any(allowed)) and not(coalesce(previous,'[]') ? item) and not(item like '기타: %' and length(trim(substring(item from 5)))>0)) then raise exception 'invalid classification';end if;
 end loop;end;$$;

create or replace function public.technician_rpc_v2(op text,p jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private,public as $$
declare s technician_private.sessions%rowtype;result jsonb;begin
 if op='session' then
  select * into s from technician_private.sessions where hash=p->>'hash';
  if s.role='admin' then begin s=technician_private.require_admin_v2(p->>'hash');exception when others then return '{}'::jsonb;end;end if;
 elsif p ? 'hash' then
  select * into s from technician_private.sessions where hash=p->>'hash';
  if s.role='admin' and op<>'logout' then s=technician_private.require_admin_v2(p->>'hash');end if;
 end if;
 if op in('admin-list','admin-detail','admin-update','reset-password') then s=technician_private.require_admin_v2(p->>'hash');end if;
 if op in('admin-update','reset-password') then
  if technician_private.command_replay_v2(s.admin_id,p) then
   if op='reset-password' then raise exception 'command already processed';end if;return '{}'::jsonb;end if;
 end if;
 result=public.technician_rpc(op,p);
 if op in('admin-update','reset-password') then
  insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,p->>'id',case when op='admin-update' then 'application-update' else 'password-reset' end);
  perform technician_private.command_finish_v2(s.admin_id,p,p->>'id');
 end if;
 return result;end;$$;

create or replace function public.technician_admin_activity_v2(p_hash text) returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype;begin s=technician_private.require_admin_v2(p_hash);update technician_private.sessions set last_active_at=now() where hash=p_hash;return jsonb_build_object('expiresAt',extract(epoch from s.expires_at)*1000,'idleExpiresAt',extract(epoch from now()+interval '15 minutes')*1000);end;$$;
create or replace function public.technician_security_event_v2(event_name text,p_hash text default null) returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare operator uuid;begin if event_name not in('login-failure','access-denied','session-expired') then raise exception 'invalid event';end if;select admin_id into operator from technician_private.sessions where hash=p_hash and role='admin';insert into technician_private.admin_security_events_v2(event,operator_id) values(event_name,operator);return '{}'::jsonb;end;$$;

create or replace function public.technician_admin_management_v2(op text,p jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private,public as $$
declare s technician_private.sessions%rowtype; a technician_private.applications%rowtype;
 profile public.expert_profiles%rowtype; profile_id text; app_id uuid;
 payload jsonb; c jsonb; current_version text; rows jsonb; consent_rows jsonb; action_name text;
begin
 s=technician_private.require_admin_v2(p->>'hash');
 if op='audit' then
  select coalesce(jsonb_agg(x),'[]') into rows from
   (select created_at as at,operator_id as "operatorId",target,action,outcome from (select created_at,operator_id,target,action,outcome from technician_private.admin_activity union all select created_at,operator_id,'security',event,'failure' from technician_private.admin_security_events_v2)e order by created_at desc limit 100)x;
  return jsonb_build_object('events',rows);
 elsif op='record' then
  if p->>'action' not in('profile-create','photo-upload','photo-select','photo-delete','photo-edit','photo-reorder','photo-replace','representative-image','work-case-save','work-case-delete','application-update','password-reset','login','logout','request-failure') then raise exception 'invalid action';end if;
  insert into technician_private.admin_activity(operator_id,target,action,outcome)
  values(s.admin_id,left(coalesce(p->>'target','session'),150),p->>'action',case when p->>'outcome'='failure' then 'failure' else 'success' end);
  return '{}'::jsonb;
 end if;
 if op='profiles' then
  select coalesce(jsonb_agg(x),'[]') into rows from
   (select ep.id,ep.name,case when ep.publication_status='hidden' and not ep.public_consent then 'withdrawn' else ep.publication_status end as publication_status,ep.public_consent,
    exists(select 1 from technician_private.applications ap where ep.id='technician-'||ap.id::text and ap.expires_at>now()) as "applicationAvailable"
    from public.expert_profiles ep where ep.id ~ '^technician-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    order by ep.id limit 100 offset greatest(0,least(10000,coalesce((p->>'offset')::integer,0))))x;
  return jsonb_build_object('profiles',rows);
 end if;
 if op not in('profile-get','profile-manage') then raise exception 'invalid operation';end if;
 profile_id=coalesce(p->>'profileId','technician-'||(p->>'id'));
 if profile_id is null or profile_id !~ '^technician-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'invalid profile id';end if;
 app_id=substring(profile_id from 12)::uuid;
 -- Serialize management changes for this application without altering the original row.
 if op='profile-manage' then perform pg_advisory_xact_lock(hashtextextended(profile_id,0));end if;
 select * into a from technician_private.applications where id=app_id and expires_at>now();
 select * into profile from public.expert_profiles where id=profile_id;
 if profile.id is null and a.id is null then raise exception 'not found';end if;
 current_version=case when profile.id is null then 'none' else md5(to_jsonb(profile)::text) end;
 if op='profile-manage' and technician_private.command_replay_v2(s.admin_id,p) then return public.technician_admin_management_v2('profile-get',p);end if;
 if op='profile-manage' then
  if p->>'action'='create' and a.id is null then raise exception 'not found';end if;
  if p ? 'applicationVersion' and (a.id is null or (p->>'applicationVersion')::integer<>a.version) then raise exception 'version conflict';end if;
  if coalesce(p->>'expectedVersion','none')<>current_version then raise exception 'version conflict';end if;
  action_name=p->>'action';payload=p->'profile';c=p->'consent';
  if action_name not in('create','update','hide','restore','withdraw') then raise exception 'invalid action';end if;
  if action_name='create' and profile.id is not null then raise exception 'version conflict';end if;
  if action_name<>'create' and profile.id is null then raise exception 'not found';end if;
  if action_name in('create','update','restore') then
   if c is null or jsonb_typeof(c) is distinct from 'object' or jsonb_typeof(c->'scope') is distinct from 'array' then raise exception 'invalid consent';end if;
   if not(c->'scope' @> '["profile"]'::jsonb)
    or exists(select 1 from jsonb_array_elements_text(c->'scope') item where item is null or item not in('profile','phone','photos'))
    or length(coalesce(c->>'evidence','')) not between 3 and 200 or length(coalesce(c->>'note',''))>500
    or c->>'confirmedAt' is null or (c->>'confirmedAt')::date>timezone('Asia/Seoul',now())::date then raise exception 'invalid consent';end if;
   if payload is not null then perform technician_private.validate_classification_v2(payload->'fields',to_jsonb(coalesce(profile.fields,string_to_array(a.data->>'fields',', '))),'fields');perform technician_private.validate_classification_v2(payload->'service_areas',to_jsonb(coalesce(profile.service_areas,string_to_array(a.data->>'areas',', '))),'areas');end if;
   if payload is null or jsonb_typeof(payload) is distinct from 'object'
    or payload->>'id' is distinct from profile_id
    or jsonb_typeof(payload->'fields') is distinct from 'array'
    or jsonb_typeof(payload->'service_areas') is distinct from 'array' then raise exception 'invalid profile';end if;
   if length(coalesce(payload->>'name','')) not between 1 and 100
    or jsonb_array_length(payload->'fields')=0 or jsonb_array_length(payload->'service_areas')=0 then raise exception 'invalid profile';end if;
   if coalesce((payload->>'phone_public')::boolean,false) and not(c->'scope' @> '["phone"]'::jsonb) then raise exception 'invalid consent';end if;
   if action_name='restore' and (profile.publication_status<>'approved' or not profile.public_consent)
    and (nullif(profile.image,'') is not null or jsonb_array_length(profile.work_photos)>0)
    and not(c->'scope' @> '["photos"]'::jsonb) then raise exception 'invalid photo consent';end if;
   if action_name='create' then
    insert into public.expert_profiles(id,name,fields,service_areas,intro,career,profile_type,phone,phone_public,public_consent,publication_status)
    values(profile_id,payload->>'name',array(select jsonb_array_elements_text(payload->'fields')),array(select jsonb_array_elements_text(payload->'service_areas')),
     payload->>'intro',payload->>'career','기술자·업체',payload->>'phone',coalesce((payload->>'phone_public')::boolean,false),true,'approved');
   else
    update public.expert_profiles set name=payload->>'name',fields=array(select jsonb_array_elements_text(payload->'fields')),
     service_areas=array(select jsonb_array_elements_text(payload->'service_areas')),intro=payload->>'intro',career=payload->>'career',
     phone=payload->>'phone',phone_public=coalesce((payload->>'phone_public')::boolean,false),
     publication_status=case when action_name='restore' then 'approved' else publication_status end,
     public_consent=case when action_name='restore' then true else public_consent end where id=profile_id;
   end if;
   insert into technician_private.profile_consents(application_id,operator_id,scope,confirmed_at,evidence_reference,note)
    values(app_id,s.admin_id,c->'scope',(c->>'confirmedAt')::date,c->>'evidence',coalesce(c->>'note',''));
  else
   update public.expert_profiles set publication_status='hidden',public_consent=case when action_name='withdraw' then false else public_consent end where id=profile_id;
  end if;
  insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,profile_id,'profile-'||action_name);
  perform technician_private.command_finish_v2(s.admin_id,p,profile_id);
  select * into profile from public.expert_profiles where id=profile_id;
  current_version=md5(to_jsonb(profile)::text);
 end if;
 select coalesce(jsonb_agg(x),'[]') into consent_rows from
  (select confirmed_at as "confirmedAt",operator_id as "operatorId",scope,evidence_reference as evidence,note,created_at as "recordedAt"
   from technician_private.profile_consents where application_id=app_id order by created_at desc,id desc limit 50)x;
 return jsonb_build_object('profile',case when profile.id is null then null else to_jsonb(profile)||jsonb_build_object('version',current_version,
  'publication_status',case when profile.publication_status='hidden' and not profile.public_consent then 'withdrawn' else profile.publication_status end) end,'consents',consent_rows);
end;
$$;


create or replace function public.technician_profile_files_v2(op text,p jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private,public as $$
declare s technician_private.sessions%rowtype;profile public.expert_profiles%rowtype;old_profile public.expert_profiles%rowtype;pid text;item jsonb;job technician_private.public_file_jobs_v2%rowtype;rows jsonb;action_name text;begin
 if op in('claim','complete','failed') then
  if op='claim' then
   update technician_private.public_file_jobs_v2 set status='pending' where status='staged' and created_at<now()-interval '1 hour';
   select * into job from technician_private.public_file_jobs_v2 where (status='pending' and (lease_until is null or lease_until<now())) or (status='processing' and lease_until<now()) order by created_at for update skip locked limit 1;
   if not found then return '{}'::jsonb;end if;
   -- A worker already holds the job row; never wait for the editor's profile lock.
   if not pg_try_advisory_xact_lock(hashtextextended(job.profile_id,0)) then return '{}'::jsonb;end if;
   if exists(select 1 from public.expert_profiles ep where position(job.image_url in to_jsonb(ep)::text)>0) then update technician_private.public_file_jobs_v2 set status='attached',lease_until=null where storage_path=job.storage_path;return '{}'::jsonb;end if;
   update technician_private.public_file_jobs_v2 set status='processing',attempts=attempts+1,lease_until=now()+interval '5 minutes' where storage_path=job.storage_path;
   return jsonb_build_object('path',job.storage_path);
  end if;
  update technician_private.public_file_jobs_v2 set status=case when op='complete' then 'done' else 'pending' end,lease_until=case when op='complete' then null else now()+interval '5 minutes' end where storage_path=p->>'path' and status='processing';return '{}'::jsonb;
 end if;
 s=technician_private.require_admin_v2(p->>'hash');pid=p->>'profileId';
 if pid is null or pid !~ '^technician-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'invalid profile id';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid,0));select * into profile from public.expert_profiles where id=pid;
 if profile.id is null or profile.publication_status is distinct from 'approved' or profile.public_consent is distinct from true then raise exception 'not found';end if;
 if op='snapshot' then return to_jsonb(profile)||jsonb_build_object('managementVersion',md5(to_jsonb(profile)::text));end if;
 if op='stage' then
  if p->>'path' !~ ('^public-profiles/'||substring(pid from 12)||'/[a-f0-9-]{36}\.jpg$') or p->>'image' is null then raise exception 'invalid storage path';end if;
  select * into job from technician_private.public_file_jobs_v2 where storage_path=p->>'path';
  if found then
   if job.operator_id<>s.admin_id or job.operation_id<>(p->>'operationId')::uuid or job.request_digest<>p->>'requestDigest' or job.status not in('staged','attached') then raise exception 'command conflict';end if;
  else insert into technician_private.public_file_jobs_v2(storage_path,profile_id,image_url,operation_id,operator_id,status,request_digest) values(p->>'path',pid,p->>'image',(p->>'operationId')::uuid,s.admin_id,'staged',p->>'requestDigest');end if;
  return '{}'::jsonb;
 end if;
 if op<>'commit' then raise exception 'invalid operation';end if;
 if technician_private.command_replay_v2(s.admin_id,p) then return to_jsonb(profile);end if;
 if md5(to_jsonb(profile)::text) is distinct from p->>'expectedVersion' then raise exception 'version conflict';end if;
 action_name=p->>'action';if action_name not in('photo-upload','photo-replace','photo-edit','photo-reorder','photo-select','photo-delete','work-case-save','work-case-delete','representative-image') then raise exception 'invalid action';end if;
 if jsonb_typeof(p->'changes') is distinct from 'object' or jsonb_typeof(p->'changes'->'work_photos') is distinct from 'array' or jsonb_array_length(p->'changes'->'work_photos')>50 then raise exception 'invalid photos';end if;
 old_profile=profile;
 -- A removed/leased immutable path cannot be reattached by a concurrent edit.
 for item in select value from jsonb_path_query(p->'changes','$.**.image') as x(value) loop
  if exists(select 1 from technician_private.public_file_jobs_v2 j where j.image_url=item#>>'{}' and j.status in('pending','processing','done')) then raise exception 'invalid file reference';end if;
  if position((item#>>'{}') in to_jsonb(old_profile)::text)=0 and not exists(select 1 from technician_private.public_file_jobs_v2 j where j.profile_id=pid and j.image_url=item#>>'{}' and j.operator_id=s.admin_id and j.operation_id=(p->>'operationId')::uuid and j.status='staged') then raise exception 'invalid file reference';end if;
 end loop;
 update public.expert_profiles set work_photos=p->'changes'->'work_photos',image=case when p->'changes' ? 'image' then p->'changes'->>'image' else image end,image_alt=case when p->'changes' ? 'image_alt' then p->'changes'->>'image_alt' else image_alt end,image_type=case when p->'changes' ? 'image_type' then p->'changes'->>'image_type' else image_type end,image_position=case when p->'changes' ? 'image_position' then p->'changes'->>'image_position' else image_position end where id=pid returning * into profile;
 update technician_private.public_file_jobs_v2 j set status='attached' where profile_id=pid and status='staged' and position(j.image_url in to_jsonb(profile)::text)>0;
 for item in select jsonb_array_elements(coalesce(p->'removedFiles','[]')) loop
  if item->>'path' !~ ('^public-profiles/'||substring(pid from 12)||'/[a-f0-9-]{36}\.jpg$') or item->>'image' is null then raise exception 'invalid storage path';end if;
  if position(item->>'image' in to_jsonb(old_profile)::text)>0 and not exists(select 1 from public.expert_profiles ep where position(item->>'image' in to_jsonb(ep)::text)>0) then
   insert into technician_private.public_file_jobs_v2(storage_path,profile_id,image_url,operation_id,operator_id,status,request_digest) values(item->>'path',pid,item->>'image',(p->>'operationId')::uuid,s.admin_id,'pending',p->>'requestDigest') on conflict(storage_path) do update set status='pending',lease_until=null;
  end if;
 end loop;
 insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,pid,action_name);
 perform technician_private.command_finish_v2(s.admin_id,p,pid);return to_jsonb(profile);
end;$$;

-- Existing legacy management name remains callable only through the new checked endpoint.
-- Auth/audit tables contain no password, token, applicant body, or photo bytes.
revoke all on function technician_private.init_admin_activity_v2(),technician_private.require_admin_v2(text),technician_private.command_replay_v2(uuid,jsonb),technician_private.command_finish_v2(uuid,jsonb,text),technician_private.validate_classification_v2(jsonb,jsonb,text),public.technician_rpc_v2(text,jsonb),public.technician_admin_activity_v2(text),public.technician_security_event_v2(text,text),public.technician_admin_management_v2(text,jsonb),public.technician_profile_files_v2(text,jsonb),public.technician_admin_command_v2(text,uuid,text) from public,anon,authenticated;
grant execute on function technician_private.require_admin_v2(text),technician_private.command_replay_v2(uuid,jsonb),technician_private.command_finish_v2(uuid,jsonb,text),technician_private.validate_classification_v2(jsonb,jsonb,text),public.technician_rpc_v2(text,jsonb),public.technician_admin_activity_v2(text),public.technician_security_event_v2(text,text),public.technician_admin_management_v2(text,jsonb),public.technician_profile_files_v2(text,jsonb),public.technician_admin_command_v2(text,uuid,text) to service_role;
commit;

