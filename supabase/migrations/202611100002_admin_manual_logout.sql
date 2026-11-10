-- User-authorized admin timeout removal. No application/profile/CMS rows change.
begin;
do $$
declare definition text; old_value text := 'now()+interval ''60 minutes'''; replacement text := '''infinity''::timestamptz';
begin
 definition=pg_get_functiondef('public.technician_rpc(text,jsonb)'::regprocedure);
 if (length(definition)-length(replace(definition,old_value,'')))/length(old_value)<>1 then
 raise exception 'Expected one admin expiry expression; nothing changed'; end if;
 if position('values(p->>''newHash'',''admin'',(p->>''user_id'')::uuid,'||old_value||')' in definition)=0 then
 raise exception 'Admin grant expression mismatch; nothing changed'; end if;
 execute replace(definition,old_value,replacement);
end;$$;
commit;
