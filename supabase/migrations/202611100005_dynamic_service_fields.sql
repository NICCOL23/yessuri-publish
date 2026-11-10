begin;
-- Persistent identities preserve old applications, profiles, links and question groups.
create table if not exists technician_private.service_field_registry_v2(
 id text primary key,value text not null unique,defaults jsonb not null,last_content jsonb,
 aliases text[] not null default '{}',works text[] not null default '{}',created_at timestamptz not null default now()
);
alter table technician_private.service_field_registry_v2 enable row level security;
revoke all on technician_private.service_field_registry_v2 from public,anon,authenticated;
grant select,insert,update on technician_private.service_field_registry_v2 to service_role;
insert into technician_private.service_field_registry_v2(id,value,defaults,last_content,aliases)
select f->>'id',f->>'value',f,coalesce((select p from technician_private.field_cms_state_v1 s cross join lateral jsonb_array_elements(s.published) p where p->>'id'=f->>'id' limit 1),f),
 array(select distinct v from unnest(array[f->>'value',f->>'label',coalesce((select p->>'label' from technician_private.field_cms_state_v1 s cross join lateral jsonb_array_elements(s.published) p where p->>'id'=f->>'id' limit 1),f->>'label')]) v)
from jsonb_array_elements(technician_private.field_cms_original_v1()) f on conflict(id) do nothing;

-- Preserve labels from every previously published revision, never from an unpublished draft.
update technician_private.service_field_registry_v2 registry set aliases=array(select distinct alias from unnest(registry.aliases||coalesce((select array_agg(f->>'label') from technician_private.field_cms_revisions_v1 revision cross join lateral jsonb_array_elements(revision.content) f where f->>'id'=registry.id and jsonb_typeof(f->'label')='string'),'{}'::text[])) alias where not exists(select 1 from technician_private.service_field_registry_v2 owner where owner.id<>registry.id and lower(owner.value)=lower(alias)));

create or replace function technician_private.service_field_usage_v2(field_id text) returns bigint
language sql stable security invoker set search_path=pg_catalog,technician_private,public as $$
select coalesce((select
 (select count(*) from technician_private.applications a where exists(select 1 from regexp_split_to_table(coalesce(a.data->>'fields',''),'[,，\n]+') token where btrim(token)=any(r.aliases)))+
 (select count(*) from public.expert_profiles e where e.fields && r.aliases)+
 (select count(*) from public.board_questions q where q.group_id=r.value or (q.group_id in ('general','electric','water','life','computer','unknown') and q.work_id=any(r.works)))
from technician_private.service_field_registry_v2 r where r.id=field_id),0)::bigint;
$$;
create or replace function technician_private.field_cms_validate_v1(content jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare item jsonb;original jsonb;image text;file_id uuid;n integer;
begin
 if jsonb_typeof(content) is distinct from 'array' then raise exception 'invalid hero fields';end if;
 n=jsonb_array_length(content);
 if n not between 1 and 200 or (select count(distinct v->>'id') from jsonb_array_elements(content) v)<>n or (select count(distinct v->>'value') from jsonb_array_elements(content) v)<>n then raise exception 'invalid hero fields';end if;
 if not exists(select 1 from jsonb_array_elements(content) f where coalesce(f->'active','true'::jsonb)='true'::jsonb) then raise exception 'at least one active field';end if;
 if exists(select 1 from jsonb_array_elements(content) f group by lower(btrim(f->>'label')) having count(*)>1) then raise exception 'duplicate field label';end if;
 for item in select * from jsonb_array_elements(content) loop
  if jsonb_typeof(item) is distinct from 'object' or (item-array['id','value','label','description','image','href','visible','active'])<>'{}'::jsonb then raise exception 'invalid hero keys';end if;
  select defaults into original from technician_private.service_field_registry_v2 where id=item->>'id';
  if original is null then
   if coalesce(item->>'id','') !~ '^custom-[a-f0-9]{12}$' or item->>'value' is distinct from item->>'id' or item->>'href' is distinct from 'find.html?category='||(item->>'id') then raise exception 'invalid hero identity';end if;
   if exists(select 1 from technician_private.service_field_registry_v2 where value=item->>'value') then raise exception 'invalid hero identity';end if;
   original=jsonb_build_object('image','assets/images/service-icons.svg#icon5');
  elsif item->>'value' is distinct from original->>'value' or item->>'href' is distinct from original->>'href' then raise exception 'invalid hero identity';
  end if;
  if jsonb_typeof(item->'label') is distinct from 'string' or length(btrim(item->>'label')) not between 1 and 40 or item->>'label' ~ '[[:cntrl:]]' then raise exception 'invalid hero label';end if;
  if exists(select 1 from technician_private.service_field_registry_v2 r where r.id<>item->>'id' and (lower(r.value)=lower(btrim(item->>'label')) or exists(select 1 from unnest(r.aliases) a where lower(a)=lower(btrim(item->>'label'))))) or exists(select 1 from jsonb_array_elements(content) other where other->>'id'<>item->>'id' and lower(other->>'value')=lower(btrim(item->>'label'))) then raise exception 'field label reserved';end if;
  if jsonb_typeof(item->'description') is distinct from 'string' or length(btrim(item->>'description')) not between 1 and 100 or item->>'description' ~ '[[:cntrl:]]' then raise exception 'invalid hero description';end if;
  if jsonb_typeof(item->'visible') is distinct from 'boolean' or (item ? 'active' and jsonb_typeof(item->'active') is distinct from 'boolean') then raise exception 'invalid hero visibility';end if;
  image=item->>'image';
  if image is not distinct from original->>'image' then continue;end if;
  if image is null or image !~ '^/api/hero-images/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$' then raise exception 'invalid hero image';end if;
  file_id=substring(image from 18 for 36)::uuid;
  if not exists(select 1 from technician_private.hero_cms_files_v1 where id=file_id and status='ready') then raise exception 'invalid hero image';end if;
 end loop;
end;$$;
create or replace function technician_private.service_field_register_v2(content jsonb,publishing boolean) returns void
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare f jsonb;
begin
 perform technician_private.field_cms_validate_v1(content);
 for f in select * from jsonb_array_elements(content) loop
  insert into technician_private.service_field_registry_v2(id,value,defaults,aliases)
   values(f->>'id',f->>'value',jsonb_set(f-'active','{image}','"assets/images/service-icons.svg#icon5"'::jsonb),array[f->>'value']) on conflict(id) do nothing;
  if publishing then
   update technician_private.service_field_registry_v2 r set last_content=f,aliases=array(select distinct a from unnest(r.aliases||array[f->>'label']) a) where r.id=f->>'id';
  end if;
 end loop;
end;$$;
create or replace function technician_private.service_field_guard_v2(content jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare f jsonb;
begin
 for f in select p from technician_private.field_cms_state_v1 s cross join lateral jsonb_array_elements(s.published) p loop
  if not exists(select 1 from jsonb_array_elements(content) c where c->>'id'=f->>'id') and technician_private.service_field_usage_v2(f->>'id')>0 then raise exception 'field in use: deactivate instead';end if;
 end loop;
end;$$;
create or replace function technician_private.service_field_restore_v2(content jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare f jsonb;result jsonb=content;
begin
 for f in select p from technician_private.field_cms_state_v1 s cross join lateral jsonb_array_elements(s.published) p loop
  if not exists(select 1 from jsonb_array_elements(result) c where c->>'id'=f->>'id') and technician_private.service_field_usage_v2(f->>'id')>0 then result=result||jsonb_build_array(f||'{"active":false}'::jsonb);end if;
 end loop;
 return result;
end;$$;
create or replace function technician_private.field_cms_snapshot_v1() returns jsonb
language sql stable security invoker set search_path=pg_catalog,technician_private as $$
select jsonb_build_object('draft',s.draft,'published',s.published,'version',s.version,
 'original',(select coalesce(jsonb_agg(r.defaults order by r.created_at,r.id),'[]'::jsonb) from technician_private.service_field_registry_v2 r),
 'retired',(select coalesce(jsonb_agg(r.last_content||'{"active":false}'::jsonb),'[]'::jsonb) from technician_private.service_field_registry_v2 r where r.last_content is not null and not exists(select 1 from jsonb_array_elements(s.draft) f where f->>'id'=r.id)),
 'aliases',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'value',r.value,'labels',r.aliases)),'[]'::jsonb) from technician_private.service_field_registry_v2 r),
 'usage',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'count',technician_private.service_field_usage_v2(r.id))),'[]'::jsonb) from technician_private.service_field_registry_v2 r),
 'revisions',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,'content',r.content,'action',r.action,'date',r.created_at) order by r.version desc) from(select * from technician_private.field_cms_revisions_v1 order by version desc limit 100) r),'[]'::jsonb))
from technician_private.field_cms_state_v1 s where singleton;
$$;
create or replace function technician_private.service_field_known_v2(v text) returns boolean
language sql stable security invoker set search_path=pg_catalog,technician_private as $$
select v in ('general','electric','water','life','computer','unknown') or exists(select 1 from technician_private.service_field_registry_v2 r where r.value=v and r.last_content is not null);
$$;
alter table public.board_questions drop constraint board_questions_group_id_check;
alter table public.board_questions add constraint board_questions_group_id_check check(technician_private.service_field_known_v2(group_id)) not valid;
alter table public.board_questions validate constraint board_questions_group_id_check;

-- Public labels only: no application/profile details are read by this helper.
create or replace function public.service_field_labels_v2(values_to_label text[]) returns text
language sql stable security definer set search_path=pg_catalog,technician_private as $$
select coalesce(string_agg(distinct label,' '),'') from (select coalesce((select r.last_content->>'label' from technician_private.service_field_registry_v2 r where r.value=v and r.last_content is not null),(select r.last_content->>'label' from technician_private.service_field_registry_v2 r where v=any(r.aliases) and r.last_content is not null order by r.id limit 1),v) label from unnest(values_to_label) v) labels;
$$;
revoke all on function public.service_field_labels_v2(text[]) from public;
grant execute on function public.service_field_labels_v2(text[]) to anon,authenticated,service_role;
revoke all on function technician_private.service_field_usage_v2(text),technician_private.service_field_register_v2(jsonb,boolean),technician_private.service_field_guard_v2(jsonb),technician_private.service_field_restore_v2(jsonb),technician_private.service_field_known_v2(text) from public,anon,authenticated;
grant execute on function technician_private.service_field_usage_v2(text),technician_private.service_field_register_v2(jsonb,boolean),technician_private.service_field_guard_v2(jsonb),technician_private.service_field_restore_v2(jsonb),technician_private.service_field_known_v2(text) to service_role;

update technician_private.service_field_registry_v2 set works=array['bath-fixture','toilet-replace','shower-faucet','bathtub','toilet-parts','bath-trap','bath-drain','bath-glass-parts','bath-silicone','bath-cabinet','bath-finish','bath-renovation','bath-ceiling']::text[] where id='bath';
update technician_private.service_field_registry_v2 set works=array['wallpaper','wallpaper-install']::text[] where id='wallpaper';
update technician_private.service_field_registry_v2 set works=array['flooring-install']::text[] where id='flooring';
update technician_private.service_field_registry_v2 set works=array['countertop','sink-install','wardrobe-install']::text[] where id='kitchen';
update technician_private.service_field_registry_v2 set works=array['boiler-service']::text[] where id='boiler';
update technician_private.service_field_registry_v2 set works=array['bath-fixture','toilet-replace','shower-faucet','bathtub','toilet-parts','bath-trap','bath-drain','kitchen-fixture','sink-bowl','leak-work','leak-report','pipe-work','thaw','water-meter','manifold','frost-faucet']::text[] where id='water';
update technician_private.service_field_registry_v2 set works=array['drain-work','drain-camera','pipe-location','pressure-clean']::text[] where id='drain';
update technician_private.service_field_registry_v2 set works=array['tile-work','deco-tile','art-wall']::text[] where id='tile';
update technician_private.service_field_registry_v2 set works=array['paint-work']::text[] where id='paint';
update technician_private.service_field_registry_v2 set works=array['bath-silicone','bath-cabinet','bath-finish','furniture','cabinet-panel','cabinet-sag','fridge-cabinet','robot-cabinet','wood-work','curtain','drying-rack','picture-rail','ceiling-access','insulation','balcony-insulation','condensation','height-adjust']::text[] where id='wood';
update technician_private.service_field_registry_v2 set works=array['clean-work']::text[] where id='clean';
update technician_private.service_field_registry_v2 set works=array['moving-small','moving-home','moving-office','moving-storage']::text[] where id='moving';
update technician_private.service_field_registry_v2 set works=array['demo-work']::text[] where id='demo';
update technician_private.service_field_registry_v2 set works=array['switch-work','smart-switch','split-switch','light-work','ceiling-fan','smoke-alarm','line-light','wire-work','dedicated-wire','electric-check']::text[] where id='electric';
update technician_private.service_field_registry_v2 set works=array['door','lock','screen','sliding','window-repair','door-replace','door-direction','threshold','door-surface','pocket-door','glass-hinge','screen-fine','screen-roll','screen-frame','screen-parts','screen-security','bath-glass-parts']::text[] where id='doors';
update technician_private.service_field_registry_v2 set works=array['locksmith-service']::text[] where id='locksmith';
update technician_private.service_field_registry_v2 set works=array['aircon-work']::text[] where id='aircon';
update technician_private.service_field_registry_v2 set works=array['cctv-new','cctv-replace','cctv-relocate','cctv-check']::text[] where id='cctv';
update technician_private.service_field_registry_v2 set works=array['tv-repair','monitor-repair']::text[] where id='display';
update technician_private.service_field_registry_v2 set works=array['it-work','computer-upgrade','computer-purchase']::text[] where id='computer';
CREATE OR REPLACE FUNCTION public.technician_field_cms_v1(op text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'technician_private'
AS $function$
declare s technician_private.sessions%rowtype; current_state technician_private.field_cms_state_v1%rowtype;
    command technician_private.field_cms_commands_v1%rowtype; file technician_private.hero_cms_files_v1%rowtype;
    command_id uuid; file_id uuid; action_name text; chosen jsonb; result jsonb;
begin
    -- These public-read operations are callable only by service_role through the Edge Function.
    if op='published' then
        select jsonb_build_object('catalogVersion',2,'aliases',(select coalesce(jsonb_agg(jsonb_build_object('value',r.value,'labels',r.aliases)),'[]'::jsonb) from technician_private.service_field_registry_v2 r where r.last_content is not null),'retired',(select coalesce(jsonb_agg(r.last_content||'{"active":false}'::jsonb),'[]'::jsonb) from technician_private.service_field_registry_v2 r where r.last_content is not null and not exists(select 1 from jsonb_array_elements(published) f where f->>'id'=r.id)),'content',published,'version',
            (select max(version) from technician_private.field_cms_revisions_v1)) into result
            from technician_private.field_cms_state_v1 where singleton;
        return result;
    end if;
    if op='public-image' then
        file_id=(p->>'id')::uuid;
        select f.* into file from technician_private.hero_cms_files_v1 f
        join technician_private.field_cms_state_v1 c on c.singleton
        where f.id=file_id and f.status='ready' and
            (c.published->>'desktopImage'='/api/hero-images/'||f.id::text||'.jpg' or c.published->>'mobileImage'='/api/hero-images/'||f.id::text||'.jpg');
        if not found then raise exception 'not found';end if;
        return jsonb_build_object('path',file.storage_path);
    end if;
    s=technician_private.require_admin_v2(p->>'hash');
    if op='state' then return technician_private.field_cms_snapshot_v1();end if;
    if op='private-image' then
        select * into file from technician_private.hero_cms_files_v1 where id=(p->>'id')::uuid and status='ready';
        if not found then raise exception 'not found';end if;
        return jsonb_build_object('path',file.storage_path);
    end if;
    if op not in ('draft','publish','restore','stage-image','ready-image') then raise exception 'invalid hero operation';end if;
    if coalesce(p->>'operationId','') !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        or coalesce(p->>'requestDigest','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid hero command';end if;
    command_id=(p->>'operationId')::uuid;
    perform pg_advisory_xact_lock(hashtextextended(command_id::text,9109));
    if op in ('stage-image','ready-image') then
        select * into file from technician_private.hero_cms_files_v1 where id=command_id for update;
        if found and (file.operator_id<>s.admin_id or file.request_digest is distinct from p->>'requestDigest') then raise exception 'command conflict';end if;
        if op='stage-image' then
            if file.id is null then
                insert into technician_private.hero_cms_files_v1(id,storage_path,operator_id,request_digest,status)
                    values(command_id,'hero-content/'||command_id::text||'.jpg',s.admin_id,p->>'requestDigest','staged') returning * into file;
            end if;
        else
            if file.id is null then raise exception 'not found';end if;
            if file.status<>'ready' then
                if coalesce(p->>'bytes','') !~ '^[0-9]{1,7}$' then raise exception 'invalid hero image';end if;
                update technician_private.hero_cms_files_v1 set status='ready',bytes=(p->>'bytes')::integer where id=file.id returning * into file;
                insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'hero','hero-image-upload');
            end if;
        end if;
        update technician_private.sessions set last_active_at=now() where hash=s.hash;
        return jsonb_build_object('id',file.id,'path',file.storage_path,'status',file.status);
    end if;
    perform pg_advisory_xact_lock(hashtextextended('service-field-catalog',9110));
    select * into current_state from technician_private.field_cms_state_v1 where singleton for update;
    if not found then raise exception 'not found';end if;
    select * into command from technician_private.field_cms_commands_v1 c where c.operation_id=command_id;
    if found then
        if command.operator_id<>s.admin_id or command.request_digest is distinct from p->>'requestDigest' or command.action<>op then raise exception 'command conflict';end if;
        return technician_private.field_cms_snapshot_v1();
    end if;
    if coalesce(p->>'version','') !~ '^[0-9]{1,15}$' or (p->>'version')::bigint <> current_state.version then raise exception 'version conflict';end if;
    if op='draft' then
        chosen=p->'content';perform technician_private.service_field_guard_v2(chosen);perform technician_private.service_field_register_v2(chosen,false);
        update technician_private.field_cms_state_v1 set draft=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        action_name='hero-draft-save';
    else
        if op='publish' then chosen=current_state.draft;else
            select content into chosen from technician_private.field_cms_revisions_v1 where id=(p->>'revisionId')::uuid;
            if not found then raise exception 'not found';end if;
        end if;
        if op='restore' then chosen=technician_private.service_field_restore_v2(chosen);end if;perform technician_private.service_field_guard_v2(chosen);perform technician_private.service_field_register_v2(chosen,true);
        update technician_private.field_cms_state_v1 set draft=chosen,published=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        insert into technician_private.field_cms_revisions_v1(version,content,action,operator_id) values(current_state.version,chosen,op,s.admin_id);
        action_name=case when op='publish' then 'hero-publish' else 'hero-restore' end;
    end if;
    insert into technician_private.field_cms_commands_v1(operation_id,operator_id,request_digest,action,applied_version)
        values(command_id,s.admin_id,p->>'requestDigest',op,current_state.version);
    insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'service-fields',action_name);
    update technician_private.sessions set last_active_at=now() where hash=s.hash;
    return technician_private.field_cms_snapshot_v1();
end;$function$
;
create or replace function public.service_field_matches_v2(values_to_match text[],selected text) returns boolean
language sql stable security definer set search_path=pg_catalog,technician_private as $$
select selected=any(values_to_match) or exists(select 1 from technician_private.service_field_registry_v2 r where r.last_content is not null
 and (r.value=selected or (selected=any(r.aliases) and not exists(select 1 from technician_private.service_field_registry_v2 owner where owner.value=selected and owner.last_content is not null)))
 and exists(select 1 from unnest(values_to_match) v where r.value=v or(v=any(r.aliases) and not exists(select 1 from technician_private.service_field_registry_v2 owner where owner.value=v and owner.last_content is not null))));
$$;
revoke all on function public.service_field_matches_v2(text[],text) from public;
grant execute on function public.service_field_matches_v2(text[],text) to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.search_public_experts(p_query text DEFAULT ''::text, p_region text DEFAULT '전체'::text, p_category text DEFAULT '전체'::text, p_page integer DEFAULT 1, p_size integer DEFAULT 12, p_sort text DEFAULT 'default'::text, p_id text DEFAULT ''::text, p_categories text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
with source as (select * from public.expert_profiles where publication_status='approved' and public_consent=true),
matched as (select * from source where
 (p_id='' or id=p_id) and (p_region='전체' or p_region=any(service_areas) or '전체'=any(service_areas))
 and (case when p_categories<>'' then exists(select 1 from unnest(string_to_array(p_categories,',')) selected where public.service_field_matches_v2(fields,selected)) else p_category='전체' or public.service_field_matches_v2(fields,p_category) end)
 and not exists(select 1 from regexp_split_to_table(lower(trim(left(p_query,80))),'\s+') term where term<>'' and position(term in lower(name||' '||array_to_string(fields,' ') || ' ' || public.service_field_labels_v2(fields)||' '||intro))=0)),
totals as(select count(*) n from matched),
page as(select * from matched order by
 case when p_sort='name' then name else '' end collate "C",
 case when p_sort='areas' then cardinality(service_areas) else 0 end desc,
 case when p_sort='default' then md5(current_date::text||id) else '' end,id
 limit greatest(1,least(p_size,12)) offset (least(greatest(p_page,1),greatest(1,ceil((select n from totals)::numeric/greatest(1,least(p_size,12)))::int))-1)*greatest(1,least(p_size,12)))
select jsonb_build_object('total',(select n from totals),'totalPublic',(select count(*) from source),'page',least(greatest(p_page,1),greatest(1,ceil((select n from totals)::numeric/greatest(1,least(p_size,12)))::int)),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'fields',fields,'serviceAreas',service_areas,'image',image,'imageAlt',image_alt,'imageType',image_type,'imagePosition',image_position,'intro',intro,'career',career,'profileType',profile_type,'phone',case when phone_public then phone else null end,'phonePublic',phone_public,'workPhotos',work_photos,'businessCard',business_card,'publicationStatus','approved','isExample',false)) from page),'[]'::jsonb));
$function$
;
commit;
