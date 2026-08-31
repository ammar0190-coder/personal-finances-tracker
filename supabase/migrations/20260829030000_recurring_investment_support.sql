-- Extends recurring_templates to support SIPs (PRD §6: "SIP handling: ...
-- using the exact same recurring confirm-before-posting mechanism as
-- Recurring Fixed Expenses"). The original §11 schema only gave
-- recurring_templates a `category_kind` (expense|income) and a required
-- category_id — there was no way to point a template at an Instrument
-- instead. See docs/DECISIONS.md D-9.

create type recurring_kind as enum ('expense', 'income', 'investment');

alter table public.recurring_templates
  add column instrument_id uuid references public.instruments (id) on delete restrict,
  add column quantity numeric(18, 4);

alter table public.recurring_templates
  alter column category_id drop not null;

alter table public.recurring_templates
  alter column kind type recurring_kind using kind::text::recurring_kind;

alter table public.recurring_templates
  add constraint category_required_for_expense_income_kind check (
    (kind in ('expense', 'income')) = (category_id is not null)
  ),
  add constraint instrument_required_for_investment_kind check (
    (kind = 'investment') = (instrument_id is not null)
  );
