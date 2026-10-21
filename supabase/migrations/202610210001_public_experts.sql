-- Public, consented profile data only. No references to private applications/photos.
begin;
create table if not exists public.expert_profiles (
 id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 name text not null check(length(name) between 1 and 100),
 fields text[] not null default '{}',service_areas text[] not null default '{}',
 image text,image_alt text,image_type text not null default 'work' check(image_type in ('work','card')),
 image_position text not null default 'center',intro text not null default '',career text not null default '',
 profile_type text not null default '',phone text,phone_public boolean not null default false,
 work_photos jsonb not null default '[]',business_card jsonb,
 publication_status text not null default 'draft' check(publication_status in ('draft','approved','hidden')),
 public_consent boolean not null default false,created_at timestamptz not null default now(),
 constraint public_phone_consent check(publication_status<>'approved' or phone_public or phone is null)
);
alter table public.expert_profiles enable row level security;
revoke all on public.expert_profiles from anon,authenticated;
grant select on public.expert_profiles to anon,authenticated;
grant all on public.expert_profiles to service_role;
drop policy if exists approved_public_profiles on public.expert_profiles;
create policy approved_public_profiles on public.expert_profiles for select to anon,authenticated
 using(publication_status='approved' and public_consent=true);
create or replace function public.search_public_experts(p_query text default '',p_region text default '전체',p_category text default '전체',p_page integer default 1,p_size integer default 12,p_sort text default 'default',p_id text default '',p_categories text default '')
returns jsonb language sql stable security invoker set search_path=public,pg_catalog as $$
with source as (select * from public.expert_profiles where publication_status='approved' and public_consent=true),
matched as (select * from source where
 (p_id='' or id=p_id) and (p_region='전체' or p_region=any(service_areas) or '전체'=any(service_areas))
 and (case when p_categories<>'' then fields && string_to_array(p_categories,',') else p_category='전체' or p_category=any(fields) end)
 and not exists(select 1 from regexp_split_to_table(lower(trim(left(p_query,80))),'\s+') term where term<>'' and position(term in lower(name||' '||array_to_string(fields,' ')||' '||intro))=0)),
totals as(select count(*) n from matched),
page as(select * from matched order by
 case when p_sort='name' then name else '' end collate "C",
 case when p_sort='areas' then cardinality(service_areas) else 0 end desc,
 case when p_sort='default' then md5(current_date::text||id) else '' end,id
 limit greatest(1,least(p_size,12)) offset (least(greatest(p_page,1),greatest(1,ceil((select n from totals)::numeric/greatest(1,least(p_size,12)))::int))-1)*greatest(1,least(p_size,12)))
select jsonb_build_object('total',(select n from totals),'totalPublic',(select count(*) from source),'page',least(greatest(p_page,1),greatest(1,ceil((select n from totals)::numeric/greatest(1,least(p_size,12)))::int)),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'fields',fields,'serviceAreas',service_areas,'image',image,'imageAlt',image_alt,'imageType',image_type,'imagePosition',image_position,'intro',intro,'career',career,'profileType',profile_type,'phone',case when phone_public then phone else null end,'phonePublic',phone_public,'workPhotos',work_photos,'businessCard',business_card,'publicationStatus','approved','isExample',false)) from page),'[]'::jsonb));
$$;
revoke all on function public.search_public_experts(text,text,text,integer,integer,text,text,text) from public;
grant execute on function public.search_public_experts(text,text,text,integer,integer,text,text,text) to anon,authenticated,service_role;
commit;
