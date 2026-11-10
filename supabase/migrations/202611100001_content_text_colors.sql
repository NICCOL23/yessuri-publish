begin;
-- Optional textColors only; existing state/revisions/auth/privileges are preserved.
CREATE OR REPLACE FUNCTION technician_private.hero_cms_validate_v1(content jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'technician_private'
AS $function$
declare color_key text;color_value jsonb;key text; value text; max_length integer; file_id uuid;
begin
    if jsonb_typeof(content) is distinct from 'object' then
        raise exception 'invalid hero content';
    end if;
    if (select count(*) from jsonb_object_keys(content-'textColors')) <> 10 then
        raise exception 'invalid hero content';
    end if;
   if content ? 'textColors' then if jsonb_typeof(content->'textColors') is distinct from 'object' then raise exception 'invalid text colors';end if;for color_key,color_value in select k,v from jsonb_each(content->'textColors') as x(k,v) loop if not(color_key=any(array['title1','title2','description1','description2'])) or jsonb_typeof(color_value) is distinct from 'string' or color_value#>>'{}' !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid text color';end if;end loop;end if; foreach key in array array['badge','title1','title2','description1','description2','buttonText','buttonHref','desktopImage','mobileImage','alt'] loop
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
        if value in ('/assets/images/hero-branded-20261020-v1/home-desktop.webp','/assets/images/hero-branded-20261020-v1/home-mobile.webp','/assets/images/hero-branded-20261020-v1/interior-desktop.webp','/assets/images/hero-branded-20261020-v1/interior-mobile.webp','/assets/images/hero-tv-20261021-v1/devices-tv-desktop.webp','/assets/images/hero-tv-20261021-v1/devices-tv-mobile.webp') then continue;end if;
        if value !~ '^/api/hero-images/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$' then raise exception 'invalid hero image';end if;
        file_id=substring(value from 18 for 36)::uuid;
        if not exists(select 1 from technician_private.hero_cms_files_v1 where id=file_id and status='ready') then raise exception 'invalid hero image';end if;
    end loop;
end;$function$
;
CREATE OR REPLACE FUNCTION technician_private.guide_cms_validate_v1(content jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'technician_private'
AS $function$declare color_key text;color_value jsonb;f jsonb;begin if jsonb_typeof(content) is distinct from 'object' then raise exception 'invalid guide object';end if;if (select count(*) from jsonb_object_keys(content-'textColors'))<>47 then raise exception 'invalid guide keys';end if;if content ? 'textColors' then if jsonb_typeof(content->'textColors') is distinct from 'object' then raise exception 'invalid text colors';end if;for color_key,color_value in select k,v from jsonb_each(content->'textColors') as x(k,v) loop if not(color_key=any(array(select entry.value->>'id' from jsonb_array_elements(technician_private.guide_cms_metadata_v1()) as entry(value)))) or jsonb_typeof(color_value) is distinct from 'string' or color_value#>>'{}' !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid text color';end if;end loop;end if;for f in select * from jsonb_array_elements(technician_private.guide_cms_metadata_v1()) loop if jsonb_typeof(content->(f->>'id')) is distinct from 'string' or length(btrim(content->>(f->>'id'))) not between 1 and (f->>'maxLength')::integer or content->>(f->>'id') ~ '[[:cntrl:]]' then raise exception 'invalid guide text';end if;end loop;end;$function$
;
commit;
