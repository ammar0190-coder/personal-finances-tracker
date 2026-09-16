-- Regression test for an auth user with no public.users profile row.
--
-- How it happened: Ammar signed in with Google on the hosted project before
-- the schema had been pushed, so the on_auth_user_created trigger did not
-- exist yet and no profile row was ever written. Every app table's user_id
-- references public.users, so every insert for that user then failed with
-- categories_user_id_fkey. The trigger is disabled below to recreate exactly
-- that state.
--
-- Run: ./scripts/test-db.sh   (local Supabase must be running). Runs as
-- supabase_admin, since disabling a trigger on auth.users needs the owner.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select has_function(
  'private', 'backfill_missing_user_profiles', array[]::text[],
  'backfill helper exists in the non-API private schema'
);

select ok(
  not has_function_privilege('anon', 'private.backfill_missing_user_profiles()', 'execute')
  and not has_function_privilege('authenticated', 'private.backfill_missing_user_profiles()', 'execute'),
  'API roles cannot call the backfill'
);

-- An auth user created while the trigger did not exist.
alter table auth.users disable trigger on_auth_user_created;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'pre-schema@example.com',
  '{"sub": "google-sub-123", "full_name": "Pre Schema"}', now(), now()
);
alter table auth.users enable trigger on_auth_user_created;

select is(
  (select count(*)::int from public.users where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'precondition: the auth user has no profile row'
);

select throws_ok(
  $$ insert into public.categories (user_id, name, kind)
     values ('11111111-1111-1111-1111-111111111111', 'Food', 'expense') $$,
  '23503',
  null,
  'precondition: without a profile row, inserting a category fails the FK'
);

-- A normal user, created with the trigger live, must be left untouched.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values (
  '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'normal@example.com',
  '{"sub": "google-sub-456", "full_name": "Normal User"}', now(), now()
);
update public.users set name = 'Edited Name' where id = '22222222-2222-2222-2222-222222222222';

select is(
  private.backfill_missing_user_profiles(),
  1,
  'backfill creates exactly the one missing profile'
);

select results_eq(
  $$ select google_id, name from public.users where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('google-sub-123'::text, 'Pre Schema'::text) $$,
  'backfilled profile carries the same identity fields the trigger would have written'
);

select is(
  (select name from public.users where id = '22222222-2222-2222-2222-222222222222'),
  'Edited Name',
  'existing profiles are not overwritten'
);

select is(
  private.backfill_missing_user_profiles(),
  0,
  'running it again is a no-op'
);

select * from finish();
rollback;
