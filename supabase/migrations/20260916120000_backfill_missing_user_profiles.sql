-- ============================================================================
-- Backfill public.users for auth users that never got a profile row.
--
-- public.users is written only by the on_auth_user_created trigger. Anyone who
-- signed in before that trigger existed (on the hosted project: a Google
-- sign-in before the first `db push`) has an auth.users row but no profile,
-- and every app table's user_id FK then rejects all of their writes.
--
-- The helper lives in `private`, which PostgREST does not expose, and API
-- roles are denied execute — it is for migrations and operators only. It
-- mirrors the identity fields handle_new_user() writes, only ever inserts,
-- and is safe to re-run. Tested in supabase/tests/backfill_user_profiles.test.sql.
-- ============================================================================

create schema if not exists private;

create function private.backfill_missing_user_profiles()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.users (id, google_id, name)
  select
    u.id,
    coalesce(u.raw_user_meta_data ->> 'sub', u.raw_user_meta_data ->> 'provider_id', u.id::text),
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', u.email, 'User')
  from auth.users u
  where not exists (select 1 from public.users p where p.id = u.id);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function private.backfill_missing_user_profiles() from public, anon, authenticated;

select private.backfill_missing_user_profiles();
