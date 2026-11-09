-- Preserve the current RPC body and all privileges; change its sole admin grant deadline.
begin;
do $$
declare definition text; old_value text := 'now()+interval ''30 minutes''';begin
 definition=pg_get_functiondef('public.technician_rpc(text,jsonb)'::regprocedure);
 if (length(definition)-length(replace(definition,old_value,'')))/length(old_value)<>1 then
  raise exception 'Expected exactly one existing admin expiry expression; nothing changed';
 end if;
 execute replace(definition,old_value,'now()+interval ''60 minutes''');
end;$$;
commit;
