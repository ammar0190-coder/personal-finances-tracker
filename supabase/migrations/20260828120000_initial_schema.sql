-- Initial schema — Personal Finance Tracker
-- Implements docs/PRD.md §11 (Data Model) and §13 (Security & Multi-User Isolation),
-- as amended by docs/DECISIONS.md D-4 (custom_interval_days).
--
-- Every table carries user_id and an identical RLS policy (§13) — enforced by
-- the database itself, so a bug in application code cannot leak one user's
-- rows into another's view. Money fields are `numeric`, never float, per §11.

-- ============================================================================
-- Enums
-- ============================================================================

create type account_type as enum ('bank', 'credit_card');
create type category_kind as enum ('expense', 'income');
create type transaction_type as enum (
  'expense', 'transfer', 'investment', 'income',
  'iou_repayment', 'iou_settlement', 'refund'
);
create type recurring_frequency as enum ('monthly', 'quarterly', 'annual', 'custom');
create type instrument_vehicle_type as enum ('equity', 'mutual_fund', 'ppf');
create type split_method as enum ('equal', 'custom');
create type iou_direction as enum ('receivable', 'payable', 'reimbursement');
create type iou_status as enum ('pending', 'partial', 'settled', 'written_off');

-- ============================================================================
-- USERS
-- One row per authenticated identity, id = auth.users.id (PRD §13: a user's
-- id corresponds 1:1 with their authenticated Google identity).
-- ============================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  google_id text unique not null,
  name text not null,
  pin_hash text,
  privacy_mode_enabled boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);

comment on table public.users is 'App-level profile, one row per Google-authenticated identity. PRD §11, §13.';

-- Auto-provision a public.users row on first sign-in, reading the Google
-- identity out of auth.users' own metadata rather than trusting client input.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, google_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'sub', new.raw_user_meta_data ->> 'provider_id', new.id::text),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email, 'User')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ACCOUNTS
-- ============================================================================

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  institution text,
  role text,
  account_type account_type not null default 'bank',
  is_spend_account boolean not null default false,
  is_savings boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.accounts.active is
  'Soft-delete flag (PRD §3, §12). "Deleting" an account never removes the row — it just hides it from pickers. Historical transactions stay fully intact.';

-- ============================================================================
-- CATEGORIES
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  kind category_kind not null,
  parent_id uuid references public.categories (id) on delete restrict,
  default_account_id uuid references public.accounts (id) on delete set null,
  active boolean not null default true
);

comment on column public.categories.active is
  'Soft-delete flag (PRD §4, §12), same rule as accounts.active.';

-- A subcategory's parent must belong to the same user and share the same kind.
-- Enforced in application code (a cross-row check isn't expressible as a
-- plain CHECK constraint without a trigger) — see src/lib/validation.

-- ============================================================================
-- RECURRING_TEMPLATES
-- ============================================================================

create table public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind category_kind not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  frequency recurring_frequency not null,
  -- PRD §11 originally had no way to express what "custom" means — see
  -- docs/DECISIONS.md D-4. Required exactly when frequency = 'custom'.
  custom_interval_days integer check (custom_interval_days is null or custom_interval_days > 0),
  next_due_date date not null,
  active boolean not null default true,
  constraint custom_interval_required_for_custom_frequency check (
    (frequency = 'custom' and custom_interval_days is not null)
    or (frequency <> 'custom' and custom_interval_days is null)
  )
);

-- ============================================================================
-- INSTRUMENTS
-- ============================================================================

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  vehicle_type instrument_vehicle_type not null,
  name text not null,
  symbol text,
  exchange text,
  constraint symbol_only_for_tradeable check (
    vehicle_type <> 'ppf' or (symbol is null and exchange is null)
  )
);

-- ============================================================================
-- TRANSACTIONS — the central ledger
-- ============================================================================

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type transaction_type not null,
  account_id uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  instrument_id uuid references public.instruments (id) on delete restrict,
  quantity numeric(18, 4),
  -- related_iou_entry_id references iou_entries, defined further below —
  -- added via a deferred ALTER TABLE after that table exists (see bottom of
  -- this file), since iou_entries itself references transactions.
  refunded_transaction_id uuid references public.transactions (id) on delete restrict,
  recurring_template_id uuid references public.recurring_templates (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  date date not null,
  note text,
  created_at timestamptz not null default now(),

  constraint to_account_only_for_transfer check (
    (type = 'transfer' and to_account_id is not null)
    or (type <> 'transfer' and to_account_id is null)
  ),
  constraint category_required_for_expense_income check (
    (type in ('expense', 'income')) = (category_id is not null)
  ),
  constraint instrument_only_for_investment check (
    (type = 'investment') = (instrument_id is not null)
  ),
  constraint refunded_transaction_only_for_refund check (
    type = 'refund' or refunded_transaction_id is null
  ),
  constraint transfer_not_self check (
    type <> 'transfer' or account_id <> to_account_id
  )
);

comment on constraint category_required_for_expense_income on public.transactions is
  'PRD §11: category_id is "set for expense/income" — required for exactly those two types, null otherwise.';

-- ============================================================================
-- GROUP_EXPENSES
-- ============================================================================

create table public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  total_amount numeric(14, 2) not null check (total_amount > 0),
  split_method split_method not null
);

comment on column public.group_expenses.transaction_id is
  'on delete cascade deliberately: the "Delete Group Expense" flow (PRD §12) removes the transaction, this row, its IOU entries, and their repayments together as one operation. The application still deletes the dependent IOU entries and repayment transactions explicitly first — see src/lib/data/group-expenses.ts — this cascade is a backstop, not the primary mechanism.';

-- ============================================================================
-- IOU_ENTRIES
-- ============================================================================

create table public.iou_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  direction iou_direction not null,
  group_expense_id uuid references public.group_expenses (id) on delete cascade,
  reimbursed_transaction_id uuid references public.transactions (id) on delete restrict,
  person_name text,
  amount_owed numeric(14, 2) not null check (amount_owed > 0),
  -- amount_settled and status are recomputed application-side from linked
  -- transactions (PRD §10.8) — stored here as a cache, never hand-incremented.
  -- See src/lib/ledger/iou.ts, the single source of truth for the formula.
  amount_settled numeric(14, 2) not null default 0 check (amount_settled >= 0),
  status iou_status not null default 'pending',
  date_incurred date not null,
  note text,

  constraint group_expense_only_for_receivable check (
    (direction = 'receivable') = (group_expense_id is not null)
  ),
  constraint reimbursed_transaction_only_for_reimbursement check (
    (direction = 'reimbursement') = (reimbursed_transaction_id is not null)
  )
);

-- Deferred FK: transactions.related_iou_entry_id -> iou_entries.id.
-- iou_entries references transactions (reimbursed_transaction_id), so this
-- direction has to be added after both tables exist.
alter table public.transactions
  add column related_iou_entry_id uuid references public.iou_entries (id) on delete restrict;

alter table public.transactions
  add constraint related_iou_entry_only_for_iou_transactions check (
    (type in ('iou_repayment', 'iou_settlement')) = (related_iou_entry_id is not null)
  );

-- ============================================================================
-- BALANCE_SNAPSHOTS
-- ============================================================================

create table public.balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  date date not null,
  actual_balance numeric(14, 2) not null,
  tracked_balance_at_time numeric(14, 2) not null,
  correcting_transaction_id uuid references public.transactions (id) on delete set null
);

-- ============================================================================
-- Indexes — PRD §13: user_id indexed on every table; account_id, category_id,
-- date indexed on transactions specifically.
-- ============================================================================

create index accounts_user_id_idx on public.accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index recurring_templates_user_id_idx on public.recurring_templates (user_id);
create index instruments_user_id_idx on public.instruments (user_id);
create index transactions_user_id_idx on public.transactions (user_id);
create index group_expenses_user_id_idx on public.group_expenses (user_id);
create index iou_entries_user_id_idx on public.iou_entries (user_id);
create index balance_snapshots_user_id_idx on public.balance_snapshots (user_id);

create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_to_account_id_idx on public.transactions (to_account_id) where to_account_id is not null;
create index transactions_category_id_idx on public.transactions (category_id) where category_id is not null;
create index transactions_date_idx on public.transactions (date);
create index transactions_related_iou_entry_id_idx on public.transactions (related_iou_entry_id) where related_iou_entry_id is not null;
create index transactions_refunded_transaction_id_idx on public.transactions (refunded_transaction_id) where refunded_transaction_id is not null;

-- ============================================================================
-- Row-Level Security — PRD §13. Identical policy on every table: a user may
-- only touch rows where user_id matches their own authenticated identity.
-- ============================================================================

alter table public.users enable row level security;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
-- No insert/delete policy for users: rows are created only by the
-- handle_new_user trigger (security definer) and deleted only via the
-- auth.users cascade — never directly by a client.

alter table public.accounts enable row level security;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete using (auth.uid() = user_id);

alter table public.categories enable row level security;
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

alter table public.recurring_templates enable row level security;
create policy "recurring_templates_select_own" on public.recurring_templates for select using (auth.uid() = user_id);
create policy "recurring_templates_insert_own" on public.recurring_templates for insert with check (auth.uid() = user_id);
create policy "recurring_templates_update_own" on public.recurring_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_templates_delete_own" on public.recurring_templates for delete using (auth.uid() = user_id);

alter table public.instruments enable row level security;
create policy "instruments_select_own" on public.instruments for select using (auth.uid() = user_id);
create policy "instruments_insert_own" on public.instruments for insert with check (auth.uid() = user_id);
create policy "instruments_update_own" on public.instruments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "instruments_delete_own" on public.instruments for delete using (auth.uid() = user_id);

alter table public.transactions enable row level security;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

alter table public.group_expenses enable row level security;
create policy "group_expenses_select_own" on public.group_expenses for select using (auth.uid() = user_id);
create policy "group_expenses_insert_own" on public.group_expenses for insert with check (auth.uid() = user_id);
create policy "group_expenses_update_own" on public.group_expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "group_expenses_delete_own" on public.group_expenses for delete using (auth.uid() = user_id);

alter table public.iou_entries enable row level security;
create policy "iou_entries_select_own" on public.iou_entries for select using (auth.uid() = user_id);
create policy "iou_entries_insert_own" on public.iou_entries for insert with check (auth.uid() = user_id);
create policy "iou_entries_update_own" on public.iou_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "iou_entries_delete_own" on public.iou_entries for delete using (auth.uid() = user_id);

alter table public.balance_snapshots enable row level security;
create policy "balance_snapshots_select_own" on public.balance_snapshots for select using (auth.uid() = user_id);
create policy "balance_snapshots_insert_own" on public.balance_snapshots for insert with check (auth.uid() = user_id);
create policy "balance_snapshots_update_own" on public.balance_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "balance_snapshots_delete_own" on public.balance_snapshots for delete using (auth.uid() = user_id);
