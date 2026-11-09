-- Additive hero CMS. Existing technician applications and profiles are unchanged.
begin;

create table if not exists technician_private.field_cms_state_v1 (
    singleton boolean primary key default true check (singleton),
    draft jsonb not null,
    published jsonb not null,
    version bigint not null default 1 check (version > 0),
    updated_at timestamptz not null default now()
);
create table if not exists technician_private.field_cms_revisions_v1 (
    id uuid primary key default gen_random_uuid(),
    version bigint not null unique,
    content jsonb not null,
    action text not null check (action in ('original','publish','restore')),
    operator_id uuid,
    created_at timestamptz not null default now()
);
create table if not exists technician_private.hero_cms_files_v1 (
    id uuid primary key,
    storage_path text not null unique,
    operator_id uuid not null,
    request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
    status text not null check (status in ('staged','ready')),
    bytes integer check (bytes between 1 and 2097152),
    created_at timestamptz not null default now(),
    check (storage_path = 'hero-content/' || id::text || '.jpg')
);
create table if not exists technician_private.field_cms_commands_v1 (
    operation_id uuid primary key,
    operator_id uuid not null,
    request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
    action text not null,
    applied_version bigint not null,
    created_at timestamptz not null default now()
);

alter table technician_private.field_cms_state_v1 enable row level security;
alter table technician_private.field_cms_revisions_v1 enable row level security;
alter table technician_private.hero_cms_files_v1 enable row level security;
alter table technician_private.field_cms_commands_v1 enable row level security;
revoke all on technician_private.field_cms_state_v1, technician_private.field_cms_revisions_v1,
    technician_private.hero_cms_files_v1, technician_private.field_cms_commands_v1 from public, anon, authenticated, service_role;
grant select,insert,update on technician_private.field_cms_state_v1, technician_private.hero_cms_files_v1 to service_role;
grant select,insert on technician_private.field_cms_revisions_v1, technician_private.field_cms_commands_v1 to service_role;

insert into technician_private.field_cms_state_v1(singleton,draft,published)
select true,'[{"value": "욕실·설비", "label": "욕실·설비", "description": "부분 수리부터 전체 시공까지", "image": "assets/images/work-tasks/v2/bath-renovation.webp", "href": "guide.html?group=general&field=bath#work-guide", "id": "bath", "visible": true}, {"value": "도배", "label": "도배", "description": "방 한 칸·집 전체", "image": "assets/images/work-tasks/v2/wallpaper-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "wallpaper", "visible": true}, {"value": "장판", "label": "장판", "description": "부분 교체·전체 시공", "image": "assets/images/work-tasks/v2/flooring-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "flooring", "visible": true}, {"value": "싱크대·붙박이장", "label": "싱크대·붙박이장", "description": "제작·교체·보수 상담", "image": "assets/images/service-expansion/sink-wardrobe.webp", "href": "guide.html?group=general&field=kitchen#work-guide", "id": "kitchen", "visible": true}, {"value": "보일러", "label": "보일러", "description": "고장·온수·난방·교체", "image": "assets/images/boiler-guide/boiler.svg", "href": "boiler-guide.html", "id": "boiler", "visible": true}, {"value": "누수·수도", "label": "누수·수도", "description": "수도꼭지·배관", "image": "assets/images/service-icons.svg#icon1", "href": "guide.html?group=water&field=pipes#work-guide", "id": "water", "visible": true}, {"value": "하수구·변기", "label": "하수구·변기", "description": "변기·싱크대 막힘", "image": "assets/images/service-icons.svg#icon2", "href": "guide.html?group=water&field=drain#work-guide", "id": "drain", "visible": true}, {"value": "타일", "label": "타일", "description": "깨짐·부분 보수", "image": "assets/images/service-icons.svg#icon3", "href": "guide.html?group=general&field=tile#work-guide", "id": "tile", "visible": true}, {"value": "페인트", "label": "페인트", "description": "벽면·부분 도장", "image": "assets/images/service-icons.svg#icon4", "href": "guide.html?group=general&field=paint#work-guide", "id": "paint", "visible": true}, {"value": "목공", "label": "목공", "description": "가구·선반 보수", "image": "assets/images/service-icons.svg#icon5", "href": "guide.html?group=general&field=wood#work-guide", "id": "wood", "visible": true}, {"value": "청소", "label": "청소", "description": "입주·생활 청소", "image": "assets/images/service-icons.svg#icon7", "href": "guide.html?group=life&field=clean#work-guide", "id": "clean", "visible": true}, {"value": "이사", "label": "이사", "description": "원룸·가정·포장 이사", "image": "assets/images/service-expansion-20261020/moving.webp", "href": "guide.html?group=life&field=moving#work-guide", "id": "moving", "visible": true}, {"value": "철거", "label": "철거", "description": "부분 철거", "image": "assets/images/service-icons.svg#icon8", "href": "guide.html?group=life&field=demo#work-guide", "id": "demo", "visible": true}, {"value": "전기·조명", "label": "전기·조명", "description": "전등·콘센트", "image": "assets/images/service-icons.svg#icon9", "href": "guide.html?group=electric&view=list#work-guide", "id": "electric", "visible": true}, {"value": "문·창호", "label": "문·창호", "description": "문·방충망", "image": "assets/images/service-icons.svg#icon10", "href": "guide.html?group=general&field=doors#work-guide", "id": "doors", "visible": true}, {"value": "열쇠·도어락", "label": "열쇠·도어락", "description": "잠금장치·도어락 점검·교체", "image": "assets/images/service-locksmith.svg", "href": "guide.html?group=general&field=locksmith#work-guide", "id": "locksmith", "visible": true}, {"value": "에어컨", "label": "에어컨", "description": "수리·설치·청소", "image": "assets/images/service-icons.svg#icon6", "href": "guide.html?group=life&field=aircon#work-guide", "id": "aircon", "visible": true}, {"value": "CCTV 설치", "label": "CCTV 설치", "description": "실내외 설치·교체", "image": "assets/images/service-expansion-20261020/cctv.webp", "href": "guide.html?group=life&field=cctv#work-guide", "id": "cctv", "visible": true}, {"value": "TV·LED 모니터 수리", "label": "TV·LED 모니터 수리", "description": "화면·전원 이상 상담", "image": "assets/images/service-expansion/tv-monitor.webp", "href": "guide.html?group=life&field=display#work-guide", "id": "display", "visible": true}, {"value": "컴퓨터·IT", "label": "컴퓨터 수리·업그레이드", "description": "고장 점검·성능 개선", "image": "assets/images/service-icons.svg#icon11", "href": "guide.html?group=computer&view=list#work-guide", "id": "computer", "visible": true}]'::jsonb,'[{"value": "욕실·설비", "label": "욕실·설비", "description": "부분 수리부터 전체 시공까지", "image": "assets/images/work-tasks/v2/bath-renovation.webp", "href": "guide.html?group=general&field=bath#work-guide", "id": "bath", "visible": true}, {"value": "도배", "label": "도배", "description": "방 한 칸·집 전체", "image": "assets/images/work-tasks/v2/wallpaper-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "wallpaper", "visible": true}, {"value": "장판", "label": "장판", "description": "부분 교체·전체 시공", "image": "assets/images/work-tasks/v2/flooring-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "flooring", "visible": true}, {"value": "싱크대·붙박이장", "label": "싱크대·붙박이장", "description": "제작·교체·보수 상담", "image": "assets/images/service-expansion/sink-wardrobe.webp", "href": "guide.html?group=general&field=kitchen#work-guide", "id": "kitchen", "visible": true}, {"value": "보일러", "label": "보일러", "description": "고장·온수·난방·교체", "image": "assets/images/boiler-guide/boiler.svg", "href": "boiler-guide.html", "id": "boiler", "visible": true}, {"value": "누수·수도", "label": "누수·수도", "description": "수도꼭지·배관", "image": "assets/images/service-icons.svg#icon1", "href": "guide.html?group=water&field=pipes#work-guide", "id": "water", "visible": true}, {"value": "하수구·변기", "label": "하수구·변기", "description": "변기·싱크대 막힘", "image": "assets/images/service-icons.svg#icon2", "href": "guide.html?group=water&field=drain#work-guide", "id": "drain", "visible": true}, {"value": "타일", "label": "타일", "description": "깨짐·부분 보수", "image": "assets/images/service-icons.svg#icon3", "href": "guide.html?group=general&field=tile#work-guide", "id": "tile", "visible": true}, {"value": "페인트", "label": "페인트", "description": "벽면·부분 도장", "image": "assets/images/service-icons.svg#icon4", "href": "guide.html?group=general&field=paint#work-guide", "id": "paint", "visible": true}, {"value": "목공", "label": "목공", "description": "가구·선반 보수", "image": "assets/images/service-icons.svg#icon5", "href": "guide.html?group=general&field=wood#work-guide", "id": "wood", "visible": true}, {"value": "청소", "label": "청소", "description": "입주·생활 청소", "image": "assets/images/service-icons.svg#icon7", "href": "guide.html?group=life&field=clean#work-guide", "id": "clean", "visible": true}, {"value": "이사", "label": "이사", "description": "원룸·가정·포장 이사", "image": "assets/images/service-expansion-20261020/moving.webp", "href": "guide.html?group=life&field=moving#work-guide", "id": "moving", "visible": true}, {"value": "철거", "label": "철거", "description": "부분 철거", "image": "assets/images/service-icons.svg#icon8", "href": "guide.html?group=life&field=demo#work-guide", "id": "demo", "visible": true}, {"value": "전기·조명", "label": "전기·조명", "description": "전등·콘센트", "image": "assets/images/service-icons.svg#icon9", "href": "guide.html?group=electric&view=list#work-guide", "id": "electric", "visible": true}, {"value": "문·창호", "label": "문·창호", "description": "문·방충망", "image": "assets/images/service-icons.svg#icon10", "href": "guide.html?group=general&field=doors#work-guide", "id": "doors", "visible": true}, {"value": "열쇠·도어락", "label": "열쇠·도어락", "description": "잠금장치·도어락 점검·교체", "image": "assets/images/service-locksmith.svg", "href": "guide.html?group=general&field=locksmith#work-guide", "id": "locksmith", "visible": true}, {"value": "에어컨", "label": "에어컨", "description": "수리·설치·청소", "image": "assets/images/service-icons.svg#icon6", "href": "guide.html?group=life&field=aircon#work-guide", "id": "aircon", "visible": true}, {"value": "CCTV 설치", "label": "CCTV 설치", "description": "실내외 설치·교체", "image": "assets/images/service-expansion-20261020/cctv.webp", "href": "guide.html?group=life&field=cctv#work-guide", "id": "cctv", "visible": true}, {"value": "TV·LED 모니터 수리", "label": "TV·LED 모니터 수리", "description": "화면·전원 이상 상담", "image": "assets/images/service-expansion/tv-monitor.webp", "href": "guide.html?group=life&field=display#work-guide", "id": "display", "visible": true}, {"value": "컴퓨터·IT", "label": "컴퓨터 수리·업그레이드", "description": "고장 점검·성능 개선", "image": "assets/images/service-icons.svg#icon11", "href": "guide.html?group=computer&view=list#work-guide", "id": "computer", "visible": true}]'::jsonb
on conflict(singleton) do nothing;
insert into technician_private.field_cms_revisions_v1(version,content,action)
select version,published,'original' from technician_private.field_cms_state_v1
where not exists(select 1 from technician_private.field_cms_revisions_v1);

create or replace function technician_private.field_cms_original_v1() returns jsonb language sql immutable security invoker set search_path=pg_catalog as $$select '[{"value": "욕실·설비", "label": "욕실·설비", "description": "부분 수리부터 전체 시공까지", "image": "assets/images/work-tasks/v2/bath-renovation.webp", "href": "guide.html?group=general&field=bath#work-guide", "id": "bath", "visible": true}, {"value": "도배", "label": "도배", "description": "방 한 칸·집 전체", "image": "assets/images/work-tasks/v2/wallpaper-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "wallpaper", "visible": true}, {"value": "장판", "label": "장판", "description": "부분 교체·전체 시공", "image": "assets/images/work-tasks/v2/flooring-install.webp", "href": "guide.html?group=general&field=tile#work-guide", "id": "flooring", "visible": true}, {"value": "싱크대·붙박이장", "label": "싱크대·붙박이장", "description": "제작·교체·보수 상담", "image": "assets/images/service-expansion/sink-wardrobe.webp", "href": "guide.html?group=general&field=kitchen#work-guide", "id": "kitchen", "visible": true}, {"value": "보일러", "label": "보일러", "description": "고장·온수·난방·교체", "image": "assets/images/boiler-guide/boiler.svg", "href": "boiler-guide.html", "id": "boiler", "visible": true}, {"value": "누수·수도", "label": "누수·수도", "description": "수도꼭지·배관", "image": "assets/images/service-icons.svg#icon1", "href": "guide.html?group=water&field=pipes#work-guide", "id": "water", "visible": true}, {"value": "하수구·변기", "label": "하수구·변기", "description": "변기·싱크대 막힘", "image": "assets/images/service-icons.svg#icon2", "href": "guide.html?group=water&field=drain#work-guide", "id": "drain", "visible": true}, {"value": "타일", "label": "타일", "description": "깨짐·부분 보수", "image": "assets/images/service-icons.svg#icon3", "href": "guide.html?group=general&field=tile#work-guide", "id": "tile", "visible": true}, {"value": "페인트", "label": "페인트", "description": "벽면·부분 도장", "image": "assets/images/service-icons.svg#icon4", "href": "guide.html?group=general&field=paint#work-guide", "id": "paint", "visible": true}, {"value": "목공", "label": "목공", "description": "가구·선반 보수", "image": "assets/images/service-icons.svg#icon5", "href": "guide.html?group=general&field=wood#work-guide", "id": "wood", "visible": true}, {"value": "청소", "label": "청소", "description": "입주·생활 청소", "image": "assets/images/service-icons.svg#icon7", "href": "guide.html?group=life&field=clean#work-guide", "id": "clean", "visible": true}, {"value": "이사", "label": "이사", "description": "원룸·가정·포장 이사", "image": "assets/images/service-expansion-20261020/moving.webp", "href": "guide.html?group=life&field=moving#work-guide", "id": "moving", "visible": true}, {"value": "철거", "label": "철거", "description": "부분 철거", "image": "assets/images/service-icons.svg#icon8", "href": "guide.html?group=life&field=demo#work-guide", "id": "demo", "visible": true}, {"value": "전기·조명", "label": "전기·조명", "description": "전등·콘센트", "image": "assets/images/service-icons.svg#icon9", "href": "guide.html?group=electric&view=list#work-guide", "id": "electric", "visible": true}, {"value": "문·창호", "label": "문·창호", "description": "문·방충망", "image": "assets/images/service-icons.svg#icon10", "href": "guide.html?group=general&field=doors#work-guide", "id": "doors", "visible": true}, {"value": "열쇠·도어락", "label": "열쇠·도어락", "description": "잠금장치·도어락 점검·교체", "image": "assets/images/service-locksmith.svg", "href": "guide.html?group=general&field=locksmith#work-guide", "id": "locksmith", "visible": true}, {"value": "에어컨", "label": "에어컨", "description": "수리·설치·청소", "image": "assets/images/service-icons.svg#icon6", "href": "guide.html?group=life&field=aircon#work-guide", "id": "aircon", "visible": true}, {"value": "CCTV 설치", "label": "CCTV 설치", "description": "실내외 설치·교체", "image": "assets/images/service-expansion-20261020/cctv.webp", "href": "guide.html?group=life&field=cctv#work-guide", "id": "cctv", "visible": true}, {"value": "TV·LED 모니터 수리", "label": "TV·LED 모니터 수리", "description": "화면·전원 이상 상담", "image": "assets/images/service-expansion/tv-monitor.webp", "href": "guide.html?group=life&field=display#work-guide", "id": "display", "visible": true}, {"value": "컴퓨터·IT", "label": "컴퓨터 수리·업그레이드", "description": "고장 점검·성능 개선", "image": "assets/images/service-icons.svg#icon11", "href": "guide.html?group=computer&view=list#work-guide", "id": "computer", "visible": true}]'::jsonb$$;
revoke all on function technician_private.field_cms_original_v1() from public,anon,authenticated;
grant execute on function technician_private.field_cms_original_v1() to service_role;

create or replace function technician_private.field_cms_snapshot_v1() returns jsonb
language sql stable security invoker set search_path=pg_catalog,technician_private as $$
    select jsonb_build_object('draft',s.draft,'published',s.published,'version',s.version,
        'original',technician_private.field_cms_original_v1(),'revisions',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,
            'fields',r.content,'action',r.action,'date',r.created_at) order by r.version desc)
            from (select * from technician_private.field_cms_revisions_v1 order by version desc limit 100) r),'[]'::jsonb))
    from technician_private.field_cms_state_v1 s where singleton
$$;

create or replace function technician_private.field_cms_validate_v1(content jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare item jsonb;original jsonb;image text;file_id uuid;
begin
 if jsonb_typeof(content) is distinct from 'array' or jsonb_array_length(content)<>20 then raise exception 'invalid hero fields';end if;
 if (select count(distinct v->>'id') from jsonb_array_elements(content) v)<>20 then raise exception 'invalid hero duplicate';end if;
 for item in select * from jsonb_array_elements(content) loop
 select v into original from jsonb_array_elements(technician_private.field_cms_original_v1()) v where v->>'id'=item->>'id';
 if original is null or item->>'value' is distinct from original->>'value' or item->>'href' is distinct from original->>'href' then raise exception 'invalid hero identity';end if;
 if jsonb_typeof(item) is distinct from 'object' or (select count(*) from jsonb_object_keys(item))<>7 then raise exception 'invalid hero keys';end if;
 if jsonb_typeof(item->'label') is distinct from 'string' or length(btrim(item->>'label')) not between 1 and 40 or item->>'label' ~ '[[:cntrl:]]' then raise exception 'invalid hero label';end if;
 if jsonb_typeof(item->'description') is distinct from 'string' or length(btrim(item->>'description')) not between 1 and 100 or item->>'description' ~ '[[:cntrl:]]' then raise exception 'invalid hero description';end if;
 if jsonb_typeof(item->'visible') is distinct from 'boolean' then raise exception 'invalid hero visibility';end if;
 image=item->>'image';
 if image is not distinct from original->>'image' then continue;end if;
 if image is null or image !~ '^/api/hero-images/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$' then raise exception 'invalid hero image';end if;
 file_id=substring(image from 18 for 36)::uuid;
 if not exists(select 1 from technician_private.hero_cms_files_v1 where id=file_id and status='ready') then raise exception 'invalid hero image';end if;
 end loop;
end;$$;

create or replace function public.technician_field_cms_v1(op text,p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype; current_state technician_private.field_cms_state_v1%rowtype;
    command technician_private.field_cms_commands_v1%rowtype; file technician_private.hero_cms_files_v1%rowtype;
    command_id uuid; file_id uuid; action_name text; chosen jsonb; result jsonb;
begin
    -- These public-read operations are callable only by service_role through the Edge Function.
    if op='published' then
        select jsonb_build_object('content',published,'version',
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
    select * into current_state from technician_private.field_cms_state_v1 where singleton for update;
    if not found then raise exception 'not found';end if;
    select * into command from technician_private.field_cms_commands_v1 c where c.operation_id=command_id;
    if found then
        if command.operator_id<>s.admin_id or command.request_digest is distinct from p->>'requestDigest' or command.action<>op then raise exception 'command conflict';end if;
        return technician_private.field_cms_snapshot_v1();
    end if;
    if coalesce(p->>'version','') !~ '^[0-9]{1,15}$' or (p->>'version')::bigint <> current_state.version then raise exception 'version conflict';end if;
    if op='draft' then
        chosen=p->'content';perform technician_private.field_cms_validate_v1(chosen);
        update technician_private.field_cms_state_v1 set draft=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        action_name='hero-draft-save';
    else
        if op='publish' then chosen=current_state.draft;else
            select content into chosen from technician_private.field_cms_revisions_v1 where id=(p->>'revisionId')::uuid;
            if not found then raise exception 'not found';end if;
        end if;
        perform technician_private.field_cms_validate_v1(chosen);
        update technician_private.field_cms_state_v1 set draft=chosen,published=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        insert into technician_private.field_cms_revisions_v1(version,content,action,operator_id) values(current_state.version,chosen,op,s.admin_id);
        action_name=case when op='publish' then 'hero-publish' else 'hero-restore' end;
    end if;
    insert into technician_private.field_cms_commands_v1(operation_id,operator_id,request_digest,action,applied_version)
        values(command_id,s.admin_id,p->>'requestDigest',op,current_state.version);
    insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'service-fields',action_name);
    update technician_private.sessions set last_active_at=now() where hash=s.hash;
    return technician_private.field_cms_snapshot_v1();
end;$$;

revoke all on function technician_private.field_cms_snapshot_v1(), technician_private.field_cms_validate_v1(jsonb), public.technician_field_cms_v1(text,jsonb) from public,anon,authenticated;
grant execute on function technician_private.field_cms_snapshot_v1(), technician_private.field_cms_validate_v1(jsonb), public.technician_field_cms_v1(text,jsonb) to service_role;
create or replace function public.technician_hero_cms_v1(op text,p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype; current_state technician_private.hero_cms_state_v1%rowtype;
    command technician_private.hero_cms_commands_v1%rowtype; file technician_private.hero_cms_files_v1%rowtype;
    command_id uuid; file_id uuid; action_name text; chosen jsonb; result jsonb;
begin
    -- These public-read operations are callable only by service_role through the Edge Function.
    if op='published' then
        select jsonb_build_object('content',published,'version',
            (select max(version) from technician_private.hero_cms_revisions_v1)) into result
            from technician_private.hero_cms_state_v1 where singleton;
        return result;
    end if;
    if op='public-image' then
        file_id=(p->>'id')::uuid;
        select f.* into file from technician_private.hero_cms_files_v1 f
        join technician_private.hero_cms_state_v1 c on c.singleton
        where f.id=file_id and f.status='ready' and
            ((exists(select 1 from technician_private.field_cms_state_v1 fs cross join lateral jsonb_array_elements(fs.published) item where fs.singleton and item->>'image'='/api/hero-images/'||f.id::text||'.jpg') or c.published->>'desktopImage'='/api/hero-images/'||f.id::text||'.jpg' or c.published->>'mobileImage'='/api/hero-images/'||f.id::text||'.jpg') or exists(select 1 from technician_private.hero_cms_state_slide2_v1 x where x.singleton and (x.published->>'desktopImage'='/api/hero-images/'||f.id::text||'.jpg' or x.published->>'mobileImage'='/api/hero-images/'||f.id::text||'.jpg')) or exists(select 1 from technician_private.hero_cms_state_slide3_v1 x where x.singleton and (x.published->>'desktopImage'='/api/hero-images/'||f.id::text||'.jpg' or x.published->>'mobileImage'='/api/hero-images/'||f.id::text||'.jpg')));
        if not found then raise exception 'not found';end if;
        return jsonb_build_object('path',file.storage_path);
    end if;
    s=technician_private.require_admin_v2(p->>'hash');
    if op='state' then return technician_private.hero_cms_snapshot_v1();end if;
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
    select * into current_state from technician_private.hero_cms_state_v1 where singleton for update;
    if not found then raise exception 'not found';end if;
    select * into command from technician_private.hero_cms_commands_v1 c where c.operation_id=command_id;
    if found then
        if command.operator_id<>s.admin_id or command.request_digest is distinct from p->>'requestDigest' or command.action<>op then raise exception 'command conflict';end if;
        return technician_private.hero_cms_snapshot_v1();
    end if;
    if coalesce(p->>'version','') !~ '^[0-9]{1,15}$' or (p->>'version')::bigint <> current_state.version then raise exception 'version conflict';end if;
    if op='draft' then
        chosen=p->'content';perform technician_private.hero_cms_validate_v1(chosen);
        update technician_private.hero_cms_state_v1 set draft=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        action_name='hero-draft-save';
    else
        if op='publish' then chosen=current_state.draft;else
            select content into chosen from technician_private.hero_cms_revisions_v1 where id=(p->>'revisionId')::uuid;
            if not found then raise exception 'not found';end if;
        end if;
        perform technician_private.hero_cms_validate_v1(chosen);
        update technician_private.hero_cms_state_v1 set draft=chosen,published=chosen,version=version+1,updated_at=now() where singleton returning * into current_state;
        insert into technician_private.hero_cms_revisions_v1(version,content,action,operator_id) values(current_state.version,chosen,op,s.admin_id);
        action_name=case when op='publish' then 'hero-publish' else 'hero-restore' end;
    end if;
    insert into technician_private.hero_cms_commands_v1(operation_id,operator_id,request_digest,action,applied_version)
        values(command_id,s.admin_id,p->>'requestDigest',op,current_state.version);
    insert into technician_private.admin_activity(operator_id,target,action) values(s.admin_id,'hero',action_name);
    update technician_private.sessions set last_active_at=now() where hash=s.hash;
    return technician_private.hero_cms_snapshot_v1();
end;$$;
commit;
