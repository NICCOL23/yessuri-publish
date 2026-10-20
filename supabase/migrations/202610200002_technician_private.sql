-- Separate private registration data. Only the service endpoint may execute this RPC.
begin;
create schema if not exists technician_private;
revoke all on schema technician_private from public,anon,authenticated;
grant usage on schema technician_private to service_role;
create table if not exists technician_private.admins(user_id uuid primary key references auth.users(id) on delete cascade,active boolean not null default true);
insert into technician_private.admins(user_id) select user_id from public.board_admins where active on conflict do nothing;
create table if not exists technician_private.applications(
 id uuid primary key,request_id uuid unique not null,receipt text unique not null,data jsonb not null,password_hash text not null,
 status text not null default '접수' check(status in('접수','확인 중','자료 보완 요청','검토 완료')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '6 months'),version integer not null default 1);
create table if not exists technician_private.photos(id uuid primary key,application_id uuid not null references technician_private.applications(id) on delete cascade,storage_path text unique not null,bytes integer not null,created_at timestamptz not null default now());
create table if not exists technician_private.messages(id uuid primary key default gen_random_uuid(),application_id uuid not null references technician_private.applications(id) on delete cascade,role text not null check(role in('owner','admin')),body text not null,created_at timestamptz not null default now());
create table if not exists technician_private.sessions(hash text primary key,role text not null check(role in('owner','admin')),application_id uuid references technician_private.applications(id) on delete cascade,admin_id uuid references technician_private.admins(user_id) on delete cascade,expires_at timestamptz not null);
create table if not exists technician_private.audit(id bigint generated always as identity primary key,application_id uuid,actor text not null,event text not null,note text not null default '',created_at timestamptz not null default now());
create table if not exists technician_private.rate_limits(bucket text primary key,attempts integer not null,until_at timestamptz not null);
create table if not exists technician_private.uploads(id uuid primary key,application_id uuid not null,storage_path text unique not null,created_at timestamptz not null default now());
create table if not exists technician_private.garbage(storage_path text primary key,created_at timestamptz not null default now());
create index if not exists technician_registration_feed on technician_private.applications(created_at desc,id desc);
create index if not exists technician_photos_application on technician_private.photos(application_id);
create index if not exists technician_messages_application on technician_private.messages(application_id,created_at);
revoke all on all tables in schema technician_private from public,anon,authenticated;
revoke all on all sequences in schema technician_private from public,anon,authenticated;
grant all on all tables in schema technician_private to service_role;
grant usage,select on all sequences in schema technician_private to service_role;
do $rls$ declare t record;begin for t in select tablename from pg_tables where schemaname='technician_private' loop execute format('alter table technician_private.%I enable row level security',t.tablename);end loop;end $rls$;

create or replace function public.technician_rpc(op text,p jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,technician_private,public as $$
declare a technician_private.applications%rowtype;s technician_private.sessions%rowtype;v_id uuid;v_photo record;result jsonb;rows jsonb;total integer;page_no integer;v_role text;v_count integer;
begin
 if op='rate' then
  insert into technician_private.rate_limits(bucket,attempts,until_at) values(p->>'key',1,now()+make_interval(secs=>(p->>'seconds')::integer))
  on conflict(bucket) do update set attempts=case when technician_private.rate_limits.until_at<=now() then 1 else technician_private.rate_limits.attempts+1 end,until_at=case when technician_private.rate_limits.until_at<=now() then excluded.until_at else technician_private.rate_limits.until_at end returning attempts into v_count;
  return jsonb_build_object('allowed',v_count<=(p->>'max')::integer);
 elsif op='rate-clear' then delete from technician_private.rate_limits where bucket=p->>'key';return '{}'::jsonb;
 elsif op='find-receipt' then select * into a from technician_private.applications where receipt=p->>'receipt' and expires_at>now();return case when found then to_jsonb(a) else '{}'::jsonb end;
 elsif op='find-request' then select * into a from technician_private.applications where request_id=(p->>'request_id')::uuid and expires_at>now();return case when found then to_jsonb(a) else '{}'::jsonb end;
 elsif op='grant-owner' then
  select * into a from technician_private.applications where id=(p->>'id')::uuid and password_hash=p->>'expectedHash' and expires_at>now() for update;
  if not found then raise exception 'permission denied';end if;
  insert into technician_private.sessions(hash,role,application_id,expires_at) values(p->>'newHash','owner',a.id,now()+interval '15 minutes');return jsonb_build_object('id',a.id);
 elsif op='grant-admin' then
  if not exists(select 1 from technician_private.admins where user_id=(p->>'user_id')::uuid and active) then raise exception 'permission denied';end if;
  insert into technician_private.sessions(hash,role,admin_id,expires_at) values(p->>'newHash','admin',(p->>'user_id')::uuid,now()+interval '30 minutes');return '{}'::jsonb;
 elsif op='session' then
  select ss.* into s from technician_private.sessions ss left join technician_private.admins ad on ad.user_id=ss.admin_id left join technician_private.applications ap on ap.id=ss.application_id where ss.hash=p->>'hash' and ss.expires_at>now() and ((ss.role='admin' and ad.active) or(ss.role='owner' and ap.expires_at>now()));return case when found then to_jsonb(s) else '{}'::jsonb end;
 elsif op='logout' then delete from technician_private.sessions where hash=p->>'hash';return '{}'::jsonb;
 elsif op='list' then
  page_no=greatest(1,least(10000,coalesce((p->>'page')::integer,1)));select count(*) into total from technician_private.applications where expires_at>now();
  select coalesce(jsonb_agg(x),'[]') into rows from(select id,'비공개 기술자 등록 신청' title,left(data->>'company',1)||'****' as "companyMasked",status,created_at,(select count(*) from technician_private.messages m where m.application_id=ap.id and m.role='admin') replies from technician_private.applications ap where expires_at>now() order by created_at desc,id desc limit 10 offset(page_no-1)*10)x;
  return jsonb_build_object('count',total,'page',page_no,'applications',rows);
 elsif op='reserve-uploads' then
  insert into technician_private.uploads(id,application_id,storage_path) select id,(p->>'id')::uuid,storage_path from jsonb_to_recordset(p->'photos') as x(id uuid,storage_path text);return '{}'::jsonb;
 elsif op='abandon-uploads' then
  insert into technician_private.garbage select storage_path,now() from technician_private.uploads where id in(select jsonb_array_elements_text(p->'ids')::uuid) on conflict do nothing;
  delete from technician_private.uploads where id in(select jsonb_array_elements_text(p->'ids')::uuid);return '{}'::jsonb;
 elsif op='cleanup' then
  insert into technician_private.garbage select ph.storage_path,now() from technician_private.photos ph join technician_private.applications ap on ap.id=ph.application_id where ap.expires_at<=now() on conflict do nothing;
  delete from technician_private.applications where expires_at<=now();
  insert into technician_private.garbage select storage_path,now() from technician_private.uploads where created_at<now()-interval '1 hour' on conflict do nothing;
  delete from technician_private.uploads where created_at<now()-interval '1 hour';
  delete from technician_private.sessions where expires_at<=now();delete from technician_private.audit where created_at<now()-interval '90 days';delete from technician_private.rate_limits where until_at<now()-interval '1 day';
  select coalesce(jsonb_agg(storage_path),'[]') into rows from(select storage_path from technician_private.garbage order by created_at limit 100)x;return jsonb_build_object('paths',rows);
 elsif op='cleanup-done' then delete from technician_private.garbage where storage_path in(select jsonb_array_elements_text(p->'paths'));return '{}'::jsonb;
 elsif op='create' then
  v_id=(p->>'id')::uuid;
  insert into technician_private.applications(id,request_id,receipt,data,password_hash) values(v_id,(p->>'request_id')::uuid,p->>'receipt',p->'data',p->>'password_hash');
  if jsonb_array_length(p->'photos')>5 then raise exception 'invalid photos';end if;
  insert into technician_private.photos(id,application_id,storage_path,bytes) select id,v_id,storage_path,bytes from jsonb_to_recordset(p->'photos') as x(id uuid,storage_path text,bytes integer);
  delete from technician_private.uploads where application_id=v_id;
  insert into technician_private.sessions(hash,role,application_id,expires_at) values(p->>'newHash','owner',v_id,now()+interval '15 minutes');
  insert into technician_private.audit(application_id,actor,event) values(v_id,'owner','create');return jsonb_build_object('id',v_id,'receipt',p->>'receipt');
 end if;

 select ss.* into s from technician_private.sessions ss left join technician_private.admins ad on ad.user_id=ss.admin_id left join technician_private.applications ap on ap.id=ss.application_id where ss.hash=p->>'hash' and ss.expires_at>now() and ((ss.role='admin' and ad.active) or(ss.role='owner' and ap.expires_at>now()));
 if not found then raise exception 'permission denied';end if;
 if op in('admin-list','admin-detail','admin-update','reset-password') and s.role<>'admin' then raise exception 'permission denied';end if;
 if op='admin-list' then
  page_no=greatest(1,least(10000,coalesce((p->>'page')::integer,1)));
  select count(*) into total from technician_private.applications where expires_at>now() and(coalesce(p->>'state','')='' or status=p->>'state');
  select coalesce(jsonb_agg(x),'[]') into rows from(select id,receipt,data->>'company' company,data->>'contact' contact,data->>'phone' phone,data->>'fields' fields,data->>'areas' areas,status,created_at,(select count(*) from technician_private.photos ph where ph.application_id=ap.id) as "photoCount" from technician_private.applications ap where expires_at>now() and(coalesce(p->>'state','')='' or status=p->>'state') order by created_at desc,id desc limit 10 offset(page_no-1)*10)x;
  return jsonb_build_object('count',total,'page',page_no,'applications',rows);
 end if;
 if op='photo' then select * into v_photo from technician_private.photos where id=(p->>'id')::uuid;if not found then raise exception 'not found';end if;v_id=v_photo.application_id;else v_id=(p->>'id')::uuid;end if;
 if s.role='owner' and s.application_id<>v_id then raise exception 'permission denied';end if;
 if op in('edit','reply','delete','password') and s.role<>'owner' then raise exception 'permission denied';end if;
 select * into a from technician_private.applications where id=v_id and expires_at>now() for update;
 if not found then raise exception 'not found';end if;
 if op='photo' then return to_jsonb(v_photo);
 elsif op in('detail','admin-detail') then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'bytes',bytes,'created_at',created_at) order by created_at,id),'[]') into rows from technician_private.photos where application_id=v_id;
  result=jsonb_build_object('application',a.data||jsonb_build_object('id',a.id,'receipt',a.receipt,'status',a.status,'created_at',a.created_at,'updated_at',a.updated_at,'expires_at',a.expires_at,'version',a.version),'photos',rows,'messages',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'role',role,'body',body,'created_at',created_at) order by created_at,id),'[]') from technician_private.messages where application_id=v_id));
  if op='admin-detail' then result=result||jsonb_build_object('history',(select coalesce(jsonb_agg(jsonb_build_object('actor',actor,'event',event,'note',note,'created_at',created_at) order by id),'[]') from technician_private.audit where application_id=v_id));end if;return result;
 elsif op='password-hash' then return jsonb_build_object('password_hash',a.password_hash);
 elsif op in('edit','reply') then
  if op='edit' then
   if (p->>'version')::integer<>a.version then raise exception 'version conflict';end if;
   if exists(select 1 from jsonb_array_elements_text(p->'keepPhotoIds') x where not exists(select 1 from technician_private.photos ph where ph.id=x::uuid and ph.application_id=v_id)) then raise exception 'permission denied';end if;
   if jsonb_array_length(p->'keepPhotoIds')+jsonb_array_length(p->'photos')>5 then raise exception 'invalid photos';end if;
   insert into technician_private.garbage select storage_path,now() from technician_private.photos where application_id=v_id and id not in(select jsonb_array_elements_text(p->'keepPhotoIds')::uuid) on conflict do nothing;
   delete from technician_private.photos where application_id=v_id and id not in(select jsonb_array_elements_text(p->'keepPhotoIds')::uuid);
   update technician_private.applications set data=p->'data' where id=v_id;
  else
   if (select count(*) from technician_private.photos where application_id=v_id)+jsonb_array_length(p->'photos')>5 then raise exception 'invalid photos';end if;
   insert into technician_private.messages(application_id,role,body) values(v_id,'owner',p->>'body');
  end if;
  insert into technician_private.photos(id,application_id,storage_path,bytes) select id,v_id,storage_path,bytes from jsonb_to_recordset(p->'photos') as x(id uuid,storage_path text,bytes integer);
  delete from technician_private.uploads where id in(select (value->>'id')::uuid from jsonb_array_elements(p->'photos'));
  update technician_private.applications set status='확인 중',version=version+1,updated_at=now() where id=v_id;
 elsif op='delete' then
  if coalesce((p->>'confirm')::boolean,false)<>true then raise exception 'confirmation required';end if;
  insert into technician_private.garbage select storage_path,now() from technician_private.photos where application_id=v_id on conflict do nothing;
  delete from technician_private.applications where id=v_id;
 elsif op in('password','reset-password') then
  if op='password' and a.password_hash<>p->>'expectedHash' then raise exception 'permission denied';end if;
  if op='reset-password' and coalesce((p->>'identityConfirmed')::boolean,false)<>true then raise exception 'confirmation required';end if;
  update technician_private.applications set password_hash=p->>'password_hash',version=version+1,updated_at=now() where id=v_id;
  delete from technician_private.sessions where application_id=v_id;
  if op='password' then insert into technician_private.sessions(hash,role,application_id,expires_at) values(p->>'newHash','owner',v_id,now()+interval '15 minutes');end if;
 elsif op='admin-update' then
  if p->>'status' not in('접수','확인 중','자료 보완 요청','검토 완료') then raise exception 'invalid status';end if;
  update technician_private.applications set status=p->>'status',version=version+1,updated_at=now() where id=v_id;
  if length(coalesce(p->>'body',''))>0 then insert into technician_private.messages(application_id,role,body) values(v_id,'admin',p->>'body');end if;
 else raise exception 'unsupported operation';end if;
 insert into technician_private.audit(application_id,actor,event,note) values(v_id,s.role,op,case when op='reset-password' then p->>'reason' when op='admin-update' then p->>'status' else '' end);
 return '{}'::jsonb;
end $$;
revoke all on function public.technician_rpc(text,jsonb) from public,anon,authenticated;
grant execute on function public.technician_rpc(text,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('technician-private','technician-private',false,2097152,array['image/jpeg']) on conflict(id) do nothing;
commit;
