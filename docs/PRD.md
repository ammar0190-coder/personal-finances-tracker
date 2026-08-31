# Personal Finance Tracker — PRD

## 1. Overview

**Purpose:** A personal-use, non-commercial finance tracker built for real visibility into money moving across accounts, investments, fixed/variable expenses, and money owed to/from others. It is designed from the ground up to support more than one person's own financial life — each user fully configures the app for themselves — rather than being built around one hardcoded setup.

**Design principle:** Visibility with low friction. This is not a full accounting system — batch/lump-sum entry is a first-class flow, not an afterthought, since the goal is to actually keep using it past week two.

**Not in scope:** Commercial/SaaS features, public sign-up — this stays a personal tool shared only with people the owner chooses to add.

---

## 2. Users & Access

- **Authentication:** Google OAuth login. One Google account = one user account (no shared logins).
- **Quick unlock:** A PIN can be set up after the first Google login, for fast re-entry.
- **Multi-user, non-commercial:** One shared codebase/frontend for every user. Every table carries a `user_id`, so any number of people can each have a fully separate, isolated setup (see §13, Row-Level Security) — this is a personal tool used by more than one person, not a hardcoded single-user app.
- **Nothing is hardcoded per user** — accounts, categories, and default rules are all configured by each user individually during onboarding (§3.1), not baked into the app.
- **Privacy mode (default on):** Account balances masked (`xx,xx,xxx`) with a per-account reveal button. Burn-down and IOU totals always shown plainly.

*(Nickname/proxy display names — originally planned for MVP — have been moved to Phase 2; see §15.)*

---

## 3. Accounts & Transfers

**Accounts are entirely user-defined.** The app has no concept of a fixed number of accounts or fixed account roles — each user adds their own accounts during onboarding, giving each one a name, an institution, and a role/purpose in their own words (e.g. "salary-only," "daily spend," "savings").

*Example — not a schema constraint — showing how the primary user's own setup looks:*

| Account | Role (self-assigned) |
|---|---|
| HDFC | Salary lands here; leaves only for major/fixed items (rent, investments) |
| Slice | Pure savings, 5.5% p.a. daily accrual, never spent from directly |
| SBI | Default for all non-fixed spend categories |
| PNB | Idle for now |

**Account types:** every account is either a **bank** account or a **credit card** account (a structural field, not free text). This matters because a credit card's balance behaves inversely to a bank account's — spending on it *increases* what's owed rather than decreasing money available, and paying its bill is a transfer that *reduces* the owed amount rather than crediting spendable cash. Full formulas in §10.1.

**Designated roles (structural, in addition to the free-text `role` label):** a user can flag any account as their **spend account** (which one a budget-ceiling transfer targets, §10.4) and/or their **savings account** (which feeds the savings-rate calculation, §10.5). These are separate yes/no flags per account, not inferred from the free-text label.

**Transaction types:** every money movement is one of seven types, distinguished in the schema (§11) rather than living in separate tables — **Expense**, **Transfer**, **Investment**, **Income** (§3.2), **IOU repayment**, **IOU settlement**, and **Refund**. Full effects of each are defined in §10.

**Budget-by-transfer:** a transfer into the user's designated spend account acts as that period's self-imposed spend ceiling, tracked as a burn-down.

**Balances:**
- A **tracked balance** is computed automatically per account from everything logged (§10.1).
- An **actual balance** can be manually entered at any time as a correction/snapshot.
- The difference is shown as an "unaccounted" amount.

**Reconciliation:**
- Manual only — no automatic nudges. Done at the user's own cadence (e.g. weekly).
- Small deltas (~₹100–200) are simply logged as a correcting entry (§10.10).
- Deltas over ~₹500 trigger a manual audit — with the option to either review the full transaction log since the last reconciliation, or reconcile purely from memory.

**Deactivating an account:** deleting an account never touches past records. "Delete" in the UI sets `active = false` (§11) — the account disappears from onboarding pickers, category defaults, and new-transaction account selectors, but every historical transaction that references it is untouched and displays exactly as before. Reactivating simply flips the flag back.

### 3.1 Onboarding / First-Time Setup

On first login, a new user is walked through setting up their own configuration — nothing is pre-populated as if it were the only correct setup:
- **Accounts** — add each one: name, institution, role/purpose, account type (bank/credit card), and optionally flag it as the spend account and/or savings account.
- **Categories** — the app ships with an editable starter template for both expense categories (e.g. Travel, Food, Shopping, House, Leisure, Miscellaneous, with example subcategories) and income categories (Salary, Misc income). Both share the same underlying customizable category system (a category is tagged as "expense" or "income") — either set can be freely renamed, removed from, or added to.
- **Default account per category** — optional, always overridable per transaction.
- **Recurring templates** — optionally set up recurring fixed expenses and recurring income (e.g. salary) right away, or add them later.
- **Preferences** — privacy mode, PIN.

### 3.2 Income

A transaction type alongside Expense/Transfer/Investment — money entering an account from outside the user's own accounts (i.e., not a transfer from another of their own accounts). Income categories are customizable via the same category system as expenses (§3.1), starting with two defaults:

- **Salary** — a recurring income template, using the exact same mechanism as Recurring Fixed Expenses (§5): confirm-before-posting on the expected date, with an editable amount.
- **Misc income** — a single generic bucket (no subcategories by default) for anything else: freelance payment, gifts, cashback, interest, selling something, etc. Logged manually as it happens. Can be split into more specific categories later if the user chooses to, same as any other category.

**Note on reimbursements:** money a company pays back for an expense you fronted is *not* modeled as Income — it behaves like the IOU mechanism instead (a pending amount that reduces your effective spend once it arrives, rather than counting as fresh income). See §7.

**Routing behavior:** whenever a Misc income entry is logged, the user is always prompted to move that amount into their designated savings account (a suggested Transfer, pre-filled but not automatic — the user confirms or dismisses it each time). This keeps casual income from silently inflating the current period's "available to spend" unless the user deliberately chooses to keep it as spendable.

Feeds directly into the savings-rate calculation in Reports (§9).

---

## 4. Categories & Expense Logging

**Categories are fully customizable** — expense categories share the same system as income categories (§3.2). The app ships with an editable starter template; nothing is fixed:

| Category | Example subcategories |
|---|---|
| Travel | Auto, Metro |
| Food | Swiggy/Zomato, Office food, Dining out |
| Shopping | Clothes, Home, Electronics, Personal care |
| House | Rent, Utilities, Other home |
| Leisure | *(includes the Group Expense flow — see §7, IOU)* |
| Miscellaneous | — |

**Default account per category:** each user assigns a default account per category during onboarding (e.g. "daily-spend categories default to my SBI-equivalent account, fixed bills default to my HDFC-equivalent account") — always overridable per individual transaction. Not hardcoded to any specific bank.

**Logging style — hybrid, to minimize friction:**
- Larger or one-off expenses are logged as they happen.
- Small, frequent categories (e.g. office food, auto/metro) can instead be batched into a single end-of-day entry.
- Subcategory-level detail in that end-of-day batch is **optional** — a user can log full detail (e.g. "Swiggy ₹180, office food ₹160") on days they feel like it, or one blended total (e.g. "Food ₹340") on days they don't. Both are valid; the app never forces a choice.

**Notes:** an optional free-text note can be added per line item — never mandatory.

**Deactivating a category:** same rule as accounts (§3) — deleting a category sets `active = false` (§11) rather than removing it. It drops out of pickers for new transactions but every past transaction tagged with it is untouched and still reports correctly.

---

## 5. Recurring Fixed Expenses (and Recurring Income)

**Recurring templates are user-defined** — each specifies a category, an account, an amount, and a frequency (monthly, quarterly, annual, or custom — not hardcoded to monthly, even though the primary user's own items today all happen to be monthly).

*Example — the primary user's own setup:* Rent (fixed), Gym (fixed), Electricity (variable), Wifi (fixed) — all monthly.

**Confirm-before-posting:** on the due date, the item surfaces for confirmation rather than silently logging — the amount is editable at that moment (e.g. a gym fee increase) before it posts.

**Reminders:** due-date nudges for upcoming recurring items.

**Earmarking:** the dashboard's "available to spend" is reduced by upcoming recurring items that haven't posted yet, so committed-but-unpaid bills aren't mistaken for spendable money.

**Irregular renewals:** anything recurring on an unpredictable/rare cadence (e.g. an annual subscription) is just logged as a one-off expense when it happens, not set up as a template.

**Recurring income:** Salary (§3.2) uses this exact same mechanism, just on the income side of the ledger.

---

## 6. Investments & Savings

**Scope for MVP:** contribution/principal tracking only — how much has gone in, not live market value or interest earned. The schema is built so live pricing (for Instruments) can be added later without restructuring (§11); interest/returns calculations are Phase 2 only, for both Savings and PPF (§15).

**Two distinct entities live on this page, and they are never the same thing:**

**Investment Holdings** — tracked as `INSTRUMENTS` rows (§11), representing assets held *outside* the cash-account model:
- **Equity / Mutual Funds** — tradeable, each identified by a name/ticker and exchange where applicable, so a future live-pricing integration can compute "current price × quantity held" without touching historical data.
- **PPF** — a locked, non-tradeable holding (e.g. a 15-year vesting term); tracked as a running cumulative-contribution total in MVP, with no ticker/quantity concept.
- Logging an investment transaction debits the source account and increases the instrument's cumulative invested amount — there is no destination "account" created for the instrument itself.

**Savings Accounts** — tracked as ordinary `ACCOUNTS` rows with `is_savings = true` (§3), **not** as Instruments. A savings account's balance is computed by the same account-balance engine as any bank account (§10.1). Multiple savings accounts are allowed. Savings is never a `vehicle_type` and never lives in `INSTRUMENTS` — see §10.5 for exactly how contributions to it are tracked.

**SIP handling:** logged manually (not an automatic bank debit) against an Equity/Mutual Fund instrument, using the exact same recurring confirm-before-posting mechanism as Recurring Fixed Expenses.

**Investments page layout:** two clearly separated sections, never merged into one filter set — an **Investment Holdings** view (tick-box filters across Equity / Mutual Funds / PPF, combinable into any subset, similar to a brokerage portfolio page) and a **Savings Accounts** view (listing each `is_savings` account and its balance). The two totals are shown side by side, since they represent different kinds of things — a cash balance vs. money deployed into an asset.

**Interest/returns:** not calculated in MVP, for either Savings or PPF. Reconciliation (§3, §10.10) may incidentally absorb a small interest credit into the "unaccounted" delta when a balance is corrected, but the app performs no interest math itself in MVP. Phase 2 (§15) adds an explicit interest/returns calculator.

**Dashboard visibility:** Investment Holdings totals are deliberately kept off the main dashboard — the dashboard's job is expense tracking, not net-worth tracking (§8). Savings account balances, by contrast, **do** appear on the Dashboard exactly like any other account balance, since a savings account is an Account, not something exclusive to this module.

---

## 7. IOU & Reimbursements

Kept as a fully separate module from the Expense Log, given how often this comes up — covers three tracked flows: Receivables, Payables, and Reimbursements.

**Group Expense flow** (sits under Leisure, but as its own tab/flow branching into the full IOU system):
1. Log the total amount and the account it was paid from (a bank account or a credit card).
2. Add participants and the split — equal by default (total ÷ headcount, including the user), with the ability to override individual amounts (e.g. someone only had a drink). Custom amounts are **not** required to sum to `total_amount` — the gap is simply the user's own share, which isn't logged as a separate IOU entry, so there's nothing to validate against.
3. The full amount deducts from the paying account immediately, same as any other expense.
4. One IOU **Receivable** entry is created per participant, for their share owed.

**Dynamic net-spend model:** a group expense counts as spend in full at the moment it's logged, and that recorded spend *decreases* as repayments come in — e.g. ₹3,000 spent, ₹2,000 repaid back → net recorded spend is now ₹1,000. Partial repayments are supported per person, not just a binary paid/unpaid. When a repayment (full or partial) is logged, the user picks which account it lands in — there's no automatic default, since money coming back can't sensibly be credited onto a credit card the way it can a bank account (§10.8).

**Receivables vs Payables:**
- **Receivables** — money owed *to* the user, from the flow above.
- **Payables** — money the user owes someone else (e.g. someone else fronted a group expense). Smaller/secondary tab. Mirrors Receivables in reverse: creating a Payable does **not** touch balance or spend, since no money has left yet. Only when the user actually settles up does it become a real expense — deducted from balance and counted as spend, at the moment of settlement.

**Writing off a debt:** any Receivable, Payable, or Reimbursement entry that's `pending` or `partial` can be manually marked `written_off` (§11) — for the ₹50 a friend never pays back, or a reimbursement the company ultimately denies. This touches no balance and creates no Transactions row; it just removes the entry from the active Receivable/Payable lists and from the Dashboard's net totals (§8) so it stops sitting there indefinitely. Logging a further repayment against a written-off entry moves it back out of that state.

**Reimbursements — the third tab:** for expenses a company/employer will pay back. Any expense, in any category, can optionally be flagged "expected to be reimbursed" at the moment it's logged, with an expected amount (defaults to the full expense amount, editable for partial reimbursements). This creates a pending entry in the Reimbursements tab — a checklist, exactly like Receivables. When the money actually arrives, the user checks it off (fully or partially) and picks which account it landed in. That reduces the original expense's effective spend by the reimbursed amount, using the same mechanism as a Receivable repayment (§10.3) — it is *not* treated as fresh income.

*Grouping reimbursements:* since each one links back to its original expense, filtering the Reimbursements tab by that expense's category (e.g. viewing "Travel" reimbursements separately from "Food" reimbursements) comes for free — no separate reimbursement-category system is needed.

---

## 8. Dashboard

**Data shown:**
1. **Account balances** — every account, masked by default (`xx,xx,xxx`) with a per-account reveal toggle. Credit card accounts show amount owed, clearly distinguished from bank balances (§10.1).
2. **Spend burn-down** for the selected period — spent vs. "available to spend" (already reduced by upcoming recurring bills, per §5's earmarking).
3. **IOU snapshot** — net Receivable and net Payable totals (written-off entries excluded, §7), shown at lower visual priority than balances/burn-down.
4. **Recent transactions** — a short feed of the latest log entries.
5. **Investments — deliberately absent.** Lives only in the Investments module (§6).

**Controls:**
- **Custom date-range picker** — select any start/end date and the whole view recalculates for that window (spend by category, income, net savings, IOU activity within range). If the range aligns with an actual budget/transfer cycle, it renders as a proper burn-down against that ceiling; otherwise it shows raw totals. Default view on open: the current period.
- **Quick-add shortcut** — log an expense directly from the dashboard, without navigating into the Expense Log page first.
- **Reveal/hide** toggle on each masked balance.
- **Manual "reconcile now"** action — the only trigger for reconciliation, since there's no automatic nudge (§3).
- Navigation shortcuts into every other module.

**Settings (tucked into Account Settings, not on the dashboard itself):**
- Privacy mode configuration.
- PIN setup.

*(The nickname/proxy-list manager, originally planned here, has moved to Phase 2 — see §15.)*

---

## 9. Reports

Draws on the same underlying "spend/income for a given range" engine as the Dashboard's date-range snapshot, but built for comparison and depth rather than a single quick glance.

- **Time periods:** monthly is the primary lens, with the ability to toggle category-spend analysis across weekly, monthly, and all-time windows.
- **Category breakdown:** a chart of spend by category for the selected period.
- **Subcategory drill-down:** tapping a category (e.g. Food) expands into its subcategories (Swiggy/Zomato, office food, dining out) rather than staying a flat total.
- **Trend over time:** a line chart of monthly total spend across the whole internship, to see whether spending is trending up or down over time — something a single-period snapshot can't show.
- **Savings rate:** for a given period, the share of income moved into savings (§10.5).
- **Export (phase 2):** export a period's data to Excel/Sheets.

---

## 10. Money Movement Semantics & Core Calculations

This section exists to remove every ambiguity about what happens, mechanically, when money moves — so nothing here needs to be inferred or guessed while building.

### 10.1 Account Types & Balance Calculation

Every account has an `account_type`: `bank` (default) or `credit_card`.

**Bank account tracked balance** =
&nbsp;&nbsp;+ income transactions crediting this account
&nbsp;&nbsp;+ transfers where this account is the destination
&nbsp;&nbsp;+ iou_repayment transactions crediting this account
&nbsp;&nbsp;+ refund transactions crediting this account
&nbsp;&nbsp;− expense transactions debiting this account
&nbsp;&nbsp;− transfers where this account is the source
&nbsp;&nbsp;− investment transactions debiting this account
&nbsp;&nbsp;− iou_settlement transactions debiting this account

**Credit card tracked balance** represents an amount *owed* (a debt), calculated in the opposite direction:
&nbsp;&nbsp;+ expense transactions charged to this account
&nbsp;&nbsp;+ iou_settlement transactions charged to this account
&nbsp;&nbsp;− transfers where this account is the destination (i.e. bill payments made against the card)
&nbsp;&nbsp;− refund transactions crediting this account (a return credited back to the card)

Paying a credit card bill is simply a **transfer** from a bank account into the credit-card account — no special transaction type needed. Because of the inverted formula, that transfer reduces what's owed rather than increasing a spendable balance.

### 10.2 Effect of Each Transaction Type

| Type | Effect on `account_id` | Effect on `to_account_id` | Counts as period spend? |
|---|---|---|---|
| `expense` | Debits (bank) / increases owed (credit card) | — | Yes |
| `transfer` | Debits (bank) / — | Credits (bank) / reduces owed (credit card) | No |
| `investment` | Debits (bank) / increases owed (credit card) | — | No |
| `income` | Credits (bank) / reduces owed (credit card) | — | No — increases available-to-spend |
| `iou_repayment` | Credits whichever account receives it | — | Reduces the *effective* spend of the originating Group Expense (§10.8) |
| `iou_settlement` | Debits (bank) / increases owed (credit card) | — | Yes — real money leaving at settlement |
| `refund` | Credits (bank) / reduces owed (credit card) | — | Reduces the *effective* spend of the linked expense, if linked (§10.9) |

### 10.3 Spend Calculation

For a given period, **total spend** =
&nbsp;&nbsp;(sum of `expense` + `iou_settlement` transactions dated within the period)
&nbsp;&nbsp;− (sum of `iou_repayment` + `refund` amounts whose **linked original transaction** falls within that period, regardless of when the repayment/refund itself was logged)

This means checking a past period's report later on will reflect any repayments/refunds that have since come in against that period's expenses — the "effective spend" of a period can keep shrinking after the fact as money comes back, exactly matching the dynamic behavior described in §7.

### 10.4 Available-to-Spend Calculation

For the current budget cycle, on the account(s) flagged `is_spend_account` (§3):

**Available to spend** =
&nbsp;&nbsp;+ amount transferred into the spend account for this cycle (the budget ceiling)
&nbsp;&nbsp;+ any misc income the user chose to keep in the spend account rather than route to savings (§3.2)
&nbsp;&nbsp;− total spend so far this cycle (§10.3)
&nbsp;&nbsp;− upcoming recurring templates due within this cycle that haven't posted yet (earmarking, §5)

This can go negative once spend exceeds the ceiling — that's expected, and simply renders as an over-budget state (e.g. in red), not something the app blocks or prevents.

### 10.5 Savings Tracking

Savings accounts are Accounts (`is_savings = true`), never Instruments — the two entities are never conflated (§3, §6, §11).

**Raw savings tracked**, for a given period, = sum of transfer amounts landing in an `is_savings` account, **excluding any transfer whose source account is itself an `is_savings` account** — moving money between two of the user's own savings accounts is relocation, not new saving, the same way an ordinary account-to-account transfer isn't new income. This mirrors exactly how investment contributions are tracked (§10.7): a raw cumulative total, never treated as a category of income itself.

**Savings rate** (shown in Reports, §9) = raw savings tracked for the period ÷ total income for the period — a supporting percentage only, never implying the underlying transfer itself is income. Reported alongside — but never merged into — that period's investment-contribution total, since Savings and Investment Holdings remain visually and conceptually separate (§6).

"Raw savings tracked" is gross inflow only — it does not net out any transfer back out of a savings account within the same period. Pulling money out of savings later doesn't retroactively reduce an earlier figure; it simply counts as a reduction whenever it actually happens, in whichever period that withdrawal falls in. Kept this way deliberately for MVP simplicity.

### 10.6 Transfer Behavior

Moves money between two of the user's own accounts. Never counts as income or spend, on either side. Destination determines the effect: crediting a bank account increases its balance; crediting a credit card account reduces what's owed (§10.1).

### 10.7 Investment Behavior

Money leaves an account into an Instrument (equity, mutual fund, or PPF — never a savings account). Never counts as spend — tracked separately in the Investments module (§6). Recorded with an optional `quantity`, so a future live-pricing feature can compute current value without touching historical rows.

Money moved into a Savings account is a plain **Transfer** (§10.6), not an Investment transaction — see §10.5 for how savings contributions are tracked instead.

### 10.8 IOU & Reimbursement Behavior

Covers the mechanics from §7, extended to Reimbursements:

**Reimbursements use the same entity as Receivables** — a third `direction` value on `IOU_Entries` (§11) — except a reimbursement links directly to the original expense's transaction (via `reimbursed_transaction_id`) rather than to a `Group_Expenses` row. It's settled the same way a Receivable is: an `iou_repayment` transaction credits an account and reduces the linked expense's effective spend (§10.3).

**Account selection — always explicit, never defaulted:** whenever money comes back — a Receivable repayment or a Reimbursement — the user picks which account it's credited into, every single time. There is no automatic default, and specifically no assumption that it lands back on a credit card even when a credit card originally paid — crediting a credit card the way a bank account is credited isn't how repayments work in practice, so the app always asks rather than guessing.

**Repayment/settlement effect:** see §10.2 and §10.3 for exactly how these affect balances and spend.

**Keeping `amount_settled`/`status` correct under edits:** `IOU_Entries.amount_settled` (§11) is never hand-incremented by the app — it's recomputed by summing every `iou_repayment`/`iou_settlement` transaction linked to that entry via `related_iou_entry_id`, and that recompute runs automatically whenever a linked transaction is created, edited, or deleted (§12). `status` is derived from the recomputed total against `amount_owed` (`pending` / `partial` / `settled`) at the same time, except when it's been manually set to `written_off` (§7) — that state sticks until a new repayment is logged against the entry, which moves it back to `partial`/`settled` as appropriate. This is what keeps editing or deleting a repayment transaction (§12) safe — the entry it's linked to always reflects the current set of transactions rather than drifting out of sync.

### 10.9 Refund Behavior

A `refund` transaction credits money back into an account, with an optional `refunded_transaction_id` linking it to the original expense it refunds.

- **Linked refund** (e.g. returned a purchase, the exact original expense is identified): the refunded amount reduces that expense's period's effective spend, exactly like an IOU repayment does for a group expense (§10.3).
- **Unlinked refund** (user doesn't bother identifying the exact original transaction): treated as a plain credit into the account, behaving like Misc income — it doesn't adjust any specific past category's effective spend, it simply increases available balance.
- A refund landing on a credit card reduces the owed balance (§10.1) rather than crediting spendable cash.

### 10.10 Reconciliation Corrections

When an actual balance is entered (§3), `delta = actual − tracked`:
- If `actual > tracked` (more money than expected — e.g. an untracked repayment or interest credit), the correcting entry is a **Misc income**.
- If `actual < tracked` (less money than expected — an untracked expense), the correcting entry is a **Misc expense**.
- Small deltas (~₹100–200) are logged this way automatically, with the user's confirmation.
- Deltas over ~₹500 trigger the manual audit flow from §3 instead of an automatic correcting entry, since something larger is worth actually finding.

### 10.11 Date/Time Semantics

- All timestamps are stored in UTC; displayed in each user's local timezone (a per-user setting, since this is multi-user).
- A transaction's `date` is the calendar date the user assigns to it — defaulting to today, but editable. Logging an end-of-day batch at 11pm still dates entries "today"; a forgotten entry can be back-dated to an earlier day.
- **Calendar periods** (used by Reports' monthly/weekly/all-time views, §9) always align to calendar month/week boundaries, regardless of the user's personal budget cycle.
- **Budget cycles** (used by the Dashboard's default burn-down, §10.4) run from one spend-account transfer to the next, which may not align with calendar months — this is why the Dashboard's default period and a Reports "monthly" view can show slightly different windows, by design.
- A Recurring Template's `next_due_date` advances by exactly one unit of its `frequency` after each confirmed posting; if the resulting day doesn't exist in the next month (e.g. the 31st), it falls to that month's last valid day.

---

## 11. Data Model

Every table below includes a direct `user_id` column, even in cases where ownership could technically be inferred through a join (e.g. Group_Expenses could derive it from its linked Transaction) — this is deliberate, so that every single table follows the exact same Row-Level Security rule with no exceptions or special-case joins (see §13).

All primary keys are UUIDs. All monetary fields are stored as decimals (never floats), to avoid rounding errors.

### USERS
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| google_id | string | From Google OAuth; unique |
| name | string | |
| pin_hash | string, nullable | Hashed PIN for quick unlock; never stored in plaintext |
| privacy_mode_enabled | boolean | Default `true` |
| timezone | string | Default `Asia/Kolkata`; per-user for multi-user support |
| created_at | timestamp | |

### ACCOUNTS
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| name | string | User-chosen, e.g. "HDFC" |
| institution | string, nullable | Bank/platform name |
| role | string, nullable | Free text the user assigns, e.g. "salary-only," "daily spend" |
| account_type | enum: `bank` \| `credit_card` | Default `bank`; determines balance-calculation direction (§10.1) |
| is_spend_account | boolean | Default `false`; marks the account the budget-ceiling/burn-down applies to (§10.4) |
| is_savings | boolean | Default `false`; marks the account(s) counted in the savings-rate calculation (§10.5) |
| active | boolean | Default `true`; set `false` on "delete" (§3) — hides it from pickers, never affects historical transactions |
| created_at | timestamp | |

*Tracked balance is not stored as a column — it's computed on read per §10.1. It may be cached for performance later, but the source of truth is always the transaction log.*

### CATEGORIES
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| name | string | |
| kind | enum: `expense` \| `income` | |
| parent_id | UUID (FK → Categories), nullable | Set only for a subcategory |
| default_account_id | UUID (FK → Accounts), nullable | User-assigned default; always overridable per transaction |
| active | boolean | Default `true`; set `false` on "delete" (§4) — hides it from pickers, never affects historical transactions |

### RECURRING_TEMPLATES
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| kind | enum: `expense` \| `income` \| `investment` | `investment` added for SIPs (§6) — see `docs/DECISIONS.md` D-9. A distinct enum from Categories' own `expense`/`income` kind, since a Category is never investment-kind. |
| category_id | UUID (FK → Categories), nullable | Required for `kind = expense \| income`, null for `investment` (D-9) |
| instrument_id | UUID (FK → Instruments), nullable | Required for `kind = investment` (a SIP), null otherwise (D-9) |
| quantity | decimal, nullable | Set only alongside `instrument_id`, mirroring `TRANSACTIONS.quantity` (D-9) |
| account_id | UUID (FK → Accounts) | |
| amount | decimal | Editable at each confirm-before-posting step |
| frequency | enum: `monthly` \| `quarterly` \| `annual` \| `custom` | Not hardcoded to monthly |
| custom_interval_days | integer, nullable | Set only when `frequency = 'custom'` — the interval in days. Added post-MVP-review (see `docs/DECISIONS.md` D-4): `custom` had no computable meaning without it. |
| next_due_date | date | Advances per §10.11 |
| active | boolean | |

### INSTRUMENTS
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| vehicle_type | enum: `equity` \| `mutual_fund` \| `ppf` | |
| name | string | e.g. "Reliance Industries," "SBI PPF" |
| symbol | string, nullable | NSE/BSE ticker or scheme code; null for PPF; populated now so live pricing can be added later without backfilling |
| exchange | string, nullable | "NSE" / "BSE"; null for PPF |

*Savings is deliberately absent from `vehicle_type` — a savings account is a row in `ACCOUNTS` with `is_savings = true`, not an Instrument. See §6 for why these stay separate.*

### TRANSACTIONS
The central ledger. Every Expense, Transfer, Investment, Income, IOU repayment, IOU settlement, and Refund is one row here, distinguished by `type`. This is what makes computing a running balance a single query per account rather than a union across several tables.

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| type | enum: `expense` \| `transfer` \| `investment` \| `income` \| `iou_repayment` \| `iou_settlement` \| `refund` | |
| account_id | UUID (FK → Accounts) | The account money moves from (or into, for income/iou_repayment/refund) |
| to_account_id | UUID (FK → Accounts), nullable | Set only for `transfer` |
| category_id | UUID (FK → Categories), nullable | Set for `expense` / `income` |
| instrument_id | UUID (FK → Instruments), nullable | Set only for `investment` |
| quantity | decimal, nullable | Set only for `investment` — shares/units bought |
| related_iou_entry_id | UUID (FK → IOU_Entries), nullable | Set only for `iou_repayment` / `iou_settlement` |
| refunded_transaction_id | UUID (FK → Transactions), nullable | Set only for `refund`, when linked to a specific original expense (§10.9) |
| recurring_template_id | UUID (FK → Recurring_Templates), nullable | Set if this row was generated by confirming a recurring template |
| amount | decimal | |
| date | date | User-assigned calendar date (§10.11) |
| note | string, nullable | Optional, never mandatory |
| created_at | timestamp | |

### GROUP_EXPENSES
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| transaction_id | UUID (FK → Transactions) | The actual money-out expense row |
| total_amount | decimal | |
| split_method | enum: `equal` \| `custom` | |

### IOU_ENTRIES
One row per person owed on a Group Expense (`receivable`), per standalone debt the user owes someone else (`payable`), or per expense awaiting company reimbursement (`reimbursement`).

| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| direction | enum: `receivable` \| `payable` \| `reimbursement` | |
| group_expense_id | UUID (FK → Group_Expenses), nullable | Set only for `receivable` rows spawned from a Group Expense |
| reimbursed_transaction_id | UUID (FK → Transactions), nullable | Set only for `reimbursement` rows — the original expense being reimbursed |
| person_name | string, nullable | The friend's name for `receivable`/`payable`; the payer's name (e.g. "Company") for `reimbursement` |
| amount_owed | decimal | |
| amount_settled | decimal | Recomputed (not hand-incremented) from linked `iou_repayment`/`iou_settlement` transactions whenever one is created, edited, or deleted (§10.8) |
| status | enum: `pending` \| `partial` \| `settled` \| `written_off` | Derived from `amount_settled` vs `amount_owed`, except `written_off`, which is a manual override (§7) |
| date_incurred | date | |
| note | string, nullable | |

### BALANCE_SNAPSHOTS
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK → Users) | |
| account_id | UUID (FK → Accounts) | |
| date | date | |
| actual_balance | decimal | What the bank app showed at time of check |
| tracked_balance_at_time | decimal | Snapshot of the computed balance at that moment, stored for history even though it's normally computed live |
| correcting_transaction_id | UUID (FK → Transactions), nullable | The Misc income/expense row created to zero out the delta (§10.10), if any |

---

## 12. Key Flows

**Logging a single Expense/Income:** user picks category → account defaults per the category's `default_account_id` (overridable) → amount, date, optional note → one Transactions row is inserted.

**End-of-day batch logging:** same as above, but the user adds several line items in one sitting before saving; each still becomes its own Transactions row. Subcategory breakdown within the batch is optional per §4 — a blended entry is just one row against the parent category instead of several against subcategories.

**Transfer:** user picks a from-account and a to-account and an amount → one Transactions row with `type = transfer`, `account_id` = source, `to_account_id` = destination. Effect depends on each side's `account_type` (§10.1). Never included in spend totals.

**Investment contribution:** user picks (or creates) an Instrument, an account, an amount, and optionally a quantity → one Transactions row with `type = investment`, `instrument_id` and `quantity` set. Never included in spend totals.

**Recurring template posting (expense or income):** on `next_due_date`, the app surfaces the template for confirmation → user confirms (editing the amount if needed) → a Transactions row is created with `recurring_template_id` set → `next_due_date` advances per §10.11.

**Misc income + savings routing:** user logs a Misc Income transaction (`type = income`) → app immediately prompts a pre-filled Transfer of that same amount into the user's `is_savings` account → user confirms or dismisses. Dismissing leaves the income sitting in whichever account it landed in, counted toward that period's available-to-spend.

**Group Expense (creates Receivables):** user logs total amount + paying account → one Transactions row (`type = expense`) is created and the full amount deducts immediately → a Group_Expenses row is created linking to that transaction → participants and their split are entered → one IOU_Entries row (`direction = receivable`) is created per participant, referencing the Group_Expenses row, `status = pending`.

**IOU repayment (receivable):** user marks a person as paid (fully or partially) → a Transactions row is created (`type = iou_repayment`, `related_iou_entry_id` set, credited into the account chosen per §10.8) → the linked IOU_Entries row's `amount_settled` increases and `status` updates (`partial` or `settled`).

**IOU payable creation:** user logs that someone else paid and they owe a share → an IOU_Entries row is created directly (`direction = payable`, no `group_expense_id`, no Transactions row yet) — nothing touches balance or spend at this point.

**IOU settlement (payable):** user actually pays the person back → a Transactions row is created (`type = iou_settlement`, `related_iou_entry_id` set, deducted from whichever account paid) → this row **does** count as spend (real money left) → the linked IOU_Entries row's `amount_settled` increases and `status` updates.

**Flagging an expense as reimbursable:** while logging any Expense, the user can optionally mark it "expected to be reimbursed" with an expected amount (defaults to the full amount) → an IOU_Entries row is created (`direction = reimbursement`, `reimbursed_transaction_id` = that expense), `status = pending`. The expense itself posts normally; nothing about its own transaction changes.

**Reimbursement received:** user checks off a pending reimbursement (fully or partially), choosing which account it lands in → a Transactions row is created (`type = iou_repayment`, `related_iou_entry_id` set) → the linked IOU_Entries row's `amount_settled` increases and `status` updates → the original expense's effective spend reduces accordingly (§10.3).

**Refund:** user logs money coming back for something they bought → a Transactions row is created (`type = refund`), optionally with `refunded_transaction_id` set if they identify the original expense → effective spend adjusts per §10.3 and §10.9.

**Edit transaction:** user opens any past Transactions row and changes amount, date, category, account, and/or note → the row updates in place. `type` itself is not editable (delete and re-log instead if the type was wrong). If the edited row is linked to an IOU_Entries row via `related_iou_entry_id` (i.e. it's an `iou_repayment`/`iou_settlement`), that entry's `amount_settled`/`status` are recomputed (§10.8). Every other downstream figure — account balances (§10.1), period spend (§10.3), available-to-spend (§10.4), savings rate (§10.5) — updates automatically on its next read, since none of them are stored; they're always computed live from the transaction log.

**Delete transaction:** user deletes a past Transactions row → allowed as long as nothing depends on it. Blocked (with an explanation) if it's the anchor of a Group_Expenses row, or is pointed at by another transaction's `refunded_transaction_id`, or by a `reimbursement`-direction IOU_Entries row's `reimbursed_transaction_id` — those need to be resolved first (see Delete Group Expense, below). If it's an `iou_repayment`/`iou_settlement`, the linked entry's `amount_settled`/`status` recompute per §10.8, same as an edit. Otherwise it's a plain delete, with every other figure recalculating live as above.

**Delete Group Expense:** user deletes the parent expense of a Group Expense → after a confirmation (since this is destructive), the Transactions row, its Group_Expenses row, every IOU_Entries row spawned from it, and any repayment transactions already logged against those entries are all removed together — a full teardown, since a Group Expense with the underlying expense gone doesn't leave anything coherent to keep.

**Write off an IOU/Reimbursement entry:** user marks a `pending`/`partial` entry as written off (§7) → `status` is set to `written_off` directly, no Transactions row is created, and it drops out of the Dashboard's net totals (§8) and the active list. Logging a new repayment against it later moves `status` back out of `written_off` automatically (§10.8).

**Deactivate an account / category:** user "deletes" an Account or Category → `active` is set to `false` (§3, §4) rather than the row being removed. It disappears from onboarding and transaction-entry pickers; every past transaction that references it is completely unaffected.

**Reconciliation:** user opens the reconcile flow for an account → enters the actual balance → app computes `delta = actual − tracked` and inserts a Balance_Snapshots row, plus a correcting Transactions row per §10.10. If `|delta|` exceeds ~₹500, the app offers either the transaction log since the last snapshot (for review) or lets the user proceed from memory, ending in a manual correcting entry instead of an automatic one.

**Onboarding (new user, first login):** Google OAuth creates the Users row → guided setup: add Accounts (with type and flags) → categories start from an editable template (§3.1) which the user can rename/add/remove for both expense and income kinds → optionally assign default accounts per category → optionally create Recurring_Templates → set PIN and privacy-mode preference.

---

## 13. Security & Multi-User Isolation

**Authentication:** Google OAuth is the sole identity provider. A user's `id` in the Users table corresponds 1:1 with their authenticated Google identity.

**Row-Level Security (RLS):** every table carries `user_id` directly (per §11), and every table has an identical RLS policy: a user may only `SELECT`/`INSERT`/`UPDATE`/`DELETE` rows where `user_id` matches their own authenticated identity. This is enforced by the database itself, not by application code — so even a bug in the app (a forgotten filter, a copy-pasted query) cannot leak one user's rows into another's view. This is what makes the multi-user design from §2 actually safe, not just structurally separated.

**PIN — a convenience layer, not a security boundary:** the PIN gates the app's UI for fast re-entry; it never substitutes for the underlying Google-authenticated session, and it grants no database access on its own. It's stored as a hash, checked client-side/session-side, purely to avoid repeating the full OAuth flow every time the app is opened.

**Privacy mode — a display convenience, not a security boundary:** masking balances (`xx,xx,xxx`) is a UI rendering choice, not encryption — the data is fully present and unmasked the instant the reveal button is tapped. It protects against someone glancing at your screen, not against unauthorized database access, which is what RLS is for.

**Indexing:** `user_id` is indexed on every table (since every query filters on it via RLS). `account_id`, `category_id`, and `date` are indexed on Transactions specifically, since those are the most common filter/sort columns for the Dashboard, Reports, and reconciliation flows.

---

## 14. Platform & Tech Stack

**Backend:** Supabase — Postgres database, built-in Google OAuth, and Row-Level Security (§13) as native features rather than custom-built.

**Frontend:** Next.js (React) — pairs naturally with Supabase (official SDK, strong documentation and community support), and builds both the responsive website and PWA behavior from one codebase.

**Hosting:** Vercel, free tier, using the default provided subdomain — no custom domain needed for now.

**Styling:** Tailwind CSS + shadcn/ui components — standard, well-documented pairing with Next.js.

**Charts:** Recharts — for the burn-down visual, category breakdowns, and trend lines in Reports.

**PWA/offline layer:** a service worker (via `next-pwa` or Workbox) for "add to home screen" and basic offline caching — also the foundation for the phase-2 offline logging + sync feature.

**Device:** Android (confirmed) — this is what makes the phase-2 native-wrapper path (via Capacitor) for SMS parsing viable, since that feature is only ever possible on Android, never iOS, regardless of platform.

**Notifications:** out of scope for MVP. Due-date reminders for recurring items (§5) are shown as an in-app indicator (e.g. an "upcoming" badge/list) rather than an OS-level push notification. Actual push notification infrastructure (Web Push via the service worker) is deferred to phase 2.

**Scheduled jobs:** Supabase Edge Functions + Cron — for anything that must happen without the app being open: checking which recurring templates are due today, and later, phase-2 tasks like polling NSE/BSE for live prices.

---

## 15. Phase 2 Roadmap

Everything below is explicitly deferred past MVP. None of it blocks MVP delivery, and the schema in §11 was deliberately designed so each item slots in later without a rework.

1. **Live NSE/BSE price integration** — `Instruments` already carries `symbol`/`exchange`, and `Transactions` already carries `quantity` for investment rows (§11). Adding this later is: a scheduled job (§14) that fetches current prices per symbol, and a computed "current value" = latest price × quantity held, shown alongside "invested" on the Investments page (§6).
2. **SMS parsing** — Android-only, requires wrapping the app natively via Capacitor to gain the OS-level SMS-read permission a website can never have (§14). Parsed messages surface as one-tap "confirm this transaction" suggestions, never auto-posting silently.
3. **Spending pattern recognition** — the app notices informal recurring patterns (e.g. "~₹300/week on auto") and suggests promoting them into a proper Recurring Template (§5), or suggests likely categories based on past logging habits.
4. **Saved friend groups (IOU)** — a reusable list of names for Group Expenses (§7), so participants don't need retyping every time.
5. **Excel/Sheets export** — exports a selected period's data (transactions, category breakdown) from Reports (§9) to a spreadsheet.
6. **Offline data entry + sync** — builds on the PWA/service-worker foundation already in place for MVP (§14); expense logging works without connectivity and syncs once back online.
7. **Biometric unlock** — technically buildable even within the MVP's plain PWA via WebAuthn/passkeys, with no native wrapper required, but grouped here per the user's own prioritization rather than MVP.
8. **Push notifications** — Web Push for due-date reminders and future alerts, once notification infrastructure is worth building (§14); MVP reminders remain a simple in-app indicator until then.
9. **Nickname/proxy naming system** — moved here from MVP. A settings-managed list of trigger words (e.g. "alc") mapped to one or more replacement words (e.g. "juice," "protein shake"); matching applies everywhere a trigger could appear — category, subcategory, or free-text note. When multiple replacements are configured for one trigger, the display randomly rotates between them across occurrences. A master toggle switches the whole app between real and proxy names — purely a display-layer transformation, never altering stored data. Will need a `proxy_rules` / `proxy_replacements` table pair and a `proxy_mode_enabled` flag on Users when built.
10. **Savings & PPF interest/returns calculator** — the user enters an interest rate and a time period, and the system computes the resulting interest/returns. Modeled as a figure layered on top of the raw principal/contribution already tracked in MVP (§10.5, §6) — never blended into the principal itself, and not part of MVP scope.
