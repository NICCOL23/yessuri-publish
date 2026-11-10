-- Add image-library metadata without changing drafts, published content, files or permissions.
begin;
alter table technician_private.hero_cms_files_v1
 add column if not exists display_name text check (length(display_name) between 1 and 160 and display_name !~ '[[:cntrl:]]'),
 add column if not exists image_kind text not null default 'any' check (image_kind in ('any','desktop','mobile'));
create index if not exists hero_cms_library_ready_v1 on technician_private.hero_cms_files_v1(created_at desc,id desc) where status='ready';
create or replace function public.technician_hero_library_v1(op text,p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype; f technician_private.hero_cms_files_v1%rowtype;
 library_offset integer; library_kind text; library_query text; result jsonb;
begin
 s=technician_private.require_admin_v2(p->>'hash');
 if op='list' then
  if coalesce(p->>'offset','0') !~ '^(0|[1-9][0-9]{0,5})$' then raise exception 'invalid hero library offset';end if;
  library_offset=coalesce(p->>'offset','0')::integer;
  library_kind=coalesce(p->>'kind','all');library_query=coalesce(p->>'query','');
  if library_kind not in ('all','any','desktop','mobile') or length(library_query)>100 then raise exception 'invalid hero library filter';end if;
  with matches as (
   select id,display_name,image_kind,bytes,created_at from technician_private.hero_cms_files_v1
   where status='ready' and (library_kind='all' or image_kind=library_kind or image_kind='any')
    and (library_query='' or strpos(lower(coalesce(display_name,'히어로 이미지')||' '||id::text),lower(library_query))>0)
   order by created_at desc,id desc limit 25 offset library_offset
  ), page as (select * from matches order by created_at desc,id desc limit 24)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'name',coalesce(display_name,'히어로 이미지 '||left(id::text,8)), 'kind',image_kind,
   'bytes',bytes,'createdAt',created_at,'path','/api/hero-images/'||id::text||'.jpg') order by created_at desc,id desc) from page),'[]'::jsonb),
   'nextOffset',case when (select count(*) from matches)>24 then library_offset+24 else null end) into result;
  return result;
 elsif op='register' then
  if jsonb_typeof(p->'name') is distinct from 'string' or length(btrim(p->>'name')) not between 1 and 160
   or p->>'name' ~ '[[:cntrl:]]' or coalesce(p->>'kind','') not in ('any','desktop','mobile') then raise exception 'invalid hero library metadata';end if;
  select * into f from technician_private.hero_cms_files_v1 where id=(p->>'operationId')::uuid and status='ready' for update;
  if not found then raise exception 'not found';end if;
  if f.operator_id<>s.admin_id or f.request_digest is distinct from p->>'requestDigest' then raise exception 'command conflict';end if;
  if f.display_name is distinct from btrim(p->>'name') or f.image_kind is distinct from p->>'kind' then
   update technician_private.hero_cms_files_v1 set display_name=btrim(p->>'name'),image_kind=p->>'kind' where id=f.id;
   insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'hero','hero-library-save');
  end if;
  return jsonb_build_object('id',f.id);
 end if;
 raise exception 'invalid hero library operation';
end;$$;
revoke all on function public.technician_hero_library_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.technician_hero_library_v1(text,jsonb) to service_role;
commit;
