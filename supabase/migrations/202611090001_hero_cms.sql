-- Additive hero CMS. Existing technician applications and profiles are unchanged.
begin;

create table if not exists technician_private.hero_cms_state_v1 (
    singleton boolean primary key default true check (singleton),
    draft jsonb not null,
    published jsonb not null,
    version bigint not null default 1 check (version > 0),
    updated_at timestamptz not null default now()
);
create table if not exists technician_private.hero_cms_revisions_v1 (
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
create table if not exists technician_private.hero_cms_commands_v1 (
    operation_id uuid primary key,
    operator_id uuid not null,
    request_digest text not null check (request_digest ~ '^[a-f0-9]{64}$'),
    action text not null,
    applied_version bigint not null,
    created_at timestamptz not null default now()
);

alter table technician_private.hero_cms_state_v1 enable row level security;
alter table technician_private.hero_cms_revisions_v1 enable row level security;
alter table technician_private.hero_cms_files_v1 enable row level security;
alter table technician_private.hero_cms_commands_v1 enable row level security;
revoke all on technician_private.hero_cms_state_v1, technician_private.hero_cms_revisions_v1,
    technician_private.hero_cms_files_v1, technician_private.hero_cms_commands_v1 from public, anon, authenticated, service_role;
grant select,insert,update on technician_private.hero_cms_state_v1, technician_private.hero_cms_files_v1 to service_role;
grant select,insert on technician_private.hero_cms_revisions_v1, technician_private.hero_cms_commands_v1 to service_role;

insert into technician_private.hero_cms_state_v1(singleton,draft,published)
select true,content,content from (select jsonb_build_object(
    'badge','부산 우리 동네 집수리',
    'title1','고장 난 일상에,',
    'title2','다시 편안함을.',
    'description1','집수리·인테리어부터 컴퓨터 수리까지.',
    'description2','부산 우리 동네 전문가를 만나보세요.',
    'buttonText','전문가 찾기',
    'buttonHref','find.html',
    'desktopImage','/assets/images/hero-branded-20261020-v1/home-desktop.webp',
    'mobileImage','/assets/images/hero-branded-20261020-v1/home-mobile.webp',
    'alt','싱크대 배관을 점검하는 기술자의 브랜드 연출 이미지') content) original
on conflict(singleton) do nothing;
insert into technician_private.hero_cms_revisions_v1(version,content,action)
select version,published,'original' from technician_private.hero_cms_state_v1
where not exists(select 1 from technician_private.hero_cms_revisions_v1);

create or replace function technician_private.hero_cms_snapshot_v1() returns jsonb
language sql stable security invoker set search_path=pg_catalog,technician_private as $$
    select jsonb_build_object('draft',s.draft,'published',s.published,'version',s.version,
        'revisions',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,
            'content',r.content,'action',r.action,'createdAt',r.created_at) order by r.version desc)
            from (select * from technician_private.hero_cms_revisions_v1 order by version desc limit 100) r),'[]'::jsonb))
    from technician_private.hero_cms_state_v1 s where singleton
$$;

create or replace function technician_private.hero_cms_validate_v1(content jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare key text; value text; max_length integer; file_id uuid;
begin
    if jsonb_typeof(content) is distinct from 'object' then
        raise exception 'invalid hero content';
    end if;
    if (select count(*) from jsonb_object_keys(content)) <> 10 then
        raise exception 'invalid hero content';
    end if;
    foreach key in array array['badge','title1','title2','description1','description2','buttonText','buttonHref','desktopImage','mobileImage','alt'] loop
        value=content->>key;
        max_length=case when key in ('badge','title1','title2') then 40 when key in ('description1','description2') then 100
            when key='buttonText' then 24 when key='alt' then 160 else 300 end;
        if jsonb_typeof(content->key) is distinct from 'string' or length(btrim(value)) < 1
            or length(value) > max_length or value ~ '[[:cntrl:]]' then raise exception 'invalid hero content';end if;
    end loop;
    value=content->>'buttonHref';
    if value !~ '^/?[a-zA-Z0-9_-]+\.html([?#][a-zA-Z0-9_~!$&()*+,;=:@%/?#.-]*)?$'
        and value !~ '^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?([/?#][a-zA-Z0-9_~!$&()*+,;=:@%/?#.-]*)?$' then
        raise exception 'invalid hero link';
    end if;
    foreach key in array array['desktopImage','mobileImage'] loop
        value=content->>key;
        if value in ('/assets/images/hero-branded-20261020-v1/home-desktop.webp','/assets/images/hero-branded-20261020-v1/home-mobile.webp') then continue;end if;
        if value !~ '^/api/hero-images/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$' then raise exception 'invalid hero image';end if;
        file_id=substring(value from 18 for 36)::uuid;
        if not exists(select 1 from technician_private.hero_cms_files_v1 where id=file_id and status='ready') then raise exception 'invalid hero image';end if;
    end loop;
end;$$;

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
            (c.published->>'desktopImage'='/api/hero-images/'||f.id::text||'.jpg' or c.published->>'mobileImage'='/api/hero-images/'||f.id::text||'.jpg');
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

revoke all on function technician_private.hero_cms_snapshot_v1(), technician_private.hero_cms_validate_v1(jsonb), public.technician_hero_cms_v1(text,jsonb) from public,anon,authenticated;
grant execute on function technician_private.hero_cms_snapshot_v1(), technician_private.hero_cms_validate_v1(jsonb), public.technician_hero_cms_v1(text,jsonb) to service_role;
commit;
