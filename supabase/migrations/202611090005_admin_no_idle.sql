-- Only remove the admin inactivity deadline. Absolute expiry, active admin,
-- token validation, manual logout and applicant sessions remain unchanged.
begin;
create or replace function technician_private.require_admin_v2(p_hash text) returns technician_private.sessions
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype;begin
 select ss.* into s from technician_private.sessions ss
 join technician_private.admins ad on ad.user_id=ss.admin_id
 where ss.hash=p_hash and ss.role='admin' and ad.active and ss.expires_at>now();
 if not found then raise exception 'permission denied';end if;return s;
end;$$;
create or replace function public.technician_admin_activity_v2(p_hash text) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,technician_private as $$
declare s technician_private.sessions%rowtype;begin
 s=technician_private.require_admin_v2(p_hash);
 update technician_private.sessions set last_active_at=now() where hash=p_hash;
 -- Compatibility field no longer introduces a separate idle deadline.
 return jsonb_build_object('expiresAt',extract(epoch from s.expires_at)*1000,
  'idleExpiresAt',extract(epoch from s.expires_at)*1000);
end;$$;
commit;
