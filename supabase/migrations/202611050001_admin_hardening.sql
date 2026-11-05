-- Additive only: no applicant/profile rows are modified by installing this migration.
begin;
create table if not exists technician_private.admin_activity (
 id bigint generated always as identity primary key,
 operator_id uuid not null,
 target text not null check(length(target)<=150),
 action text not null check(length(action)<=100),
 outcome text not null default 'success' check(outcome in ('success','failure')),
 created_at timestamptz not null default now()
);
create table if not exists technician_private.profile_consents (
 id bigint generated always as identity primary key,
 application_id uuid not null,
 operator_id uuid not null,
 scope jsonb not null check(jsonb_typeof(scope)='array'),
 confirmed_at date not null,
 evidence_reference text not null check(length(evidence_reference) between 3 and 200),
 note text not null default '' check(length(note)<=500),
 consent_version text not null default 'profile-consent-v1',
 created_at timestamptz not null default now()
);
create index if not exists technician_admin_activity_time on technician_private.admin_activity(created_at desc,id desc);
create index if not exists technician_profile_consents_application on technician_private.profile_consents(application_id,created_at desc);
alter table technician_private.admin_activity enable row level security;
alter table technician_private.profile_consents enable row level security;
revoke all on technician_private.admin_activity,technician_private.profile_consents from public,anon,authenticated;
grant select,insert on technician_private.admin_activity,technician_private.profile_consents to service_role;
grant usage,select on sequence technician_private.admin_activity_id_seq,technician_private.profile_consents_id_seq to service_role;

create or replace function public.technician_admin_management(op text,p jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private,public as $$
declare s technician_private.sessions%rowtype; a technician_private.applications%rowtype;
 profile public.expert_profiles%rowtype; profile_id text; app_id uuid;
 payload jsonb; c jsonb; current_version text; rows jsonb; consent_rows jsonb; action_name text;
begin
 select ss.* into s from technician_private.sessions ss join technician_private.admins ad on ad.user_id=ss.admin_id
 where ss.hash=p->>'hash' and ss.role='admin' and ss.expires_at>now() and ad.active;
 if not found then raise exception 'permission denied';end if;
 if op='audit' then
  select coalesce(jsonb_agg(x),'[]') into rows from
   (select created_at as at,operator_id as "operatorId",target,action,outcome from technician_private.admin_activity order by created_at desc,id desc limit 100)x;
  return jsonb_build_object('events',rows);
 elsif op='record' then
  if p->>'action' not in('profile-create','photo-upload','photo-select','photo-delete','photo-edit','photo-reorder','photo-replace','representative-image','work-case-save','work-case-delete','application-update','password-reset','login','logout','request-failure') then raise exception 'invalid action';end if;
  insert into technician_private.admin_activity(operator_id,target,action,outcome)
  values(s.admin_id,left(coalesce(p->>'target','session'),150),p->>'action',case when p->>'outcome'='failure' then 'failure' else 'success' end);
  return '{}'::jsonb;
 end if;
 if op not in('profile-get','profile-manage') then raise exception 'invalid operation';end if;
 app_id=(p->>'id')::uuid;profile_id='technician-'||app_id::text;
 -- Serialize management changes for this application without altering the original row.
 if op='profile-manage' then perform pg_advisory_xact_lock(hashtextextended(profile_id,0));end if;
 select * into a from technician_private.applications where id=app_id and expires_at>now();
 if not found then raise exception 'not found';end if;
 select * into profile from public.expert_profiles where id=profile_id;
 current_version=case when profile.id is null then 'none' else md5(to_jsonb(profile)::text) end;
 if op='profile-manage' then
  if p ? 'applicationVersion' and (p->>'applicationVersion')::integer<>a.version then raise exception 'version conflict';end if;
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
revoke all on function public.technician_admin_management(text,jsonb) from public,anon,authenticated;
grant execute on function public.technician_admin_management(text,jsonb) to service_role;
commit;
